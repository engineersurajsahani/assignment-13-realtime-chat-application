/**
 * PulseChat Client Application Logic
 */

// Initialize Socket.io client connection
const socket = io();

// Application State
const state = {
  currentUser: {
    username: "",
    avatar: "🦊",
    socketId: ""
  },
  currentMode: "channel", // "channel" | "dm"
  currentRoom: "general",
  activeDmUser: null, // { socketId, username, avatar }
  dmThreads: new Map(), // socketId -> { user: {...}, messages: [], unread: 0 }
  onlineUsers: [], // all connected users on the server
  roomUsers: [], // users in current room
  activeTypers: new Set(),
  isTyping: false,
  typingTimer: null
};

// DOM Element References
const elements = {
  loginOverlay: document.getElementById("login-overlay"),
  loginForm: document.getElementById("login-form"),
  usernameInput: document.getElementById("username-input"),
  avatarPicker: document.getElementById("avatar-picker"),
  
  myAvatarDisplay: document.getElementById("my-avatar-display"),
  myUsernameDisplay: document.getElementById("my-username-display"),
  mySocketIdDisplay: document.getElementById("my-socketid-display"),
  
  roomList: document.getElementById("room-list"),
  createRoomForm: document.getElementById("create-room-form"),
  newRoomInput: document.getElementById("new-room-input"),
  dmList: document.getElementById("dm-list"),
  totalUnreadBadge: document.getElementById("total-unread-badge"),
  
  chatHeaderIcon: document.getElementById("chat-header-icon"),
  chatHeaderTitle: document.getElementById("chat-header-title"),
  chatHeaderDesc: document.getElementById("chat-header-desc"),
  rosterToggleCount: document.getElementById("roster-toggle-count"),
  
  messagesContainer: document.getElementById("messages-container"),
  typingIndicatorBar: document.getElementById("typing-indicator-bar"),
  typingText: document.getElementById("typing-text"),
  
  chatForm: document.getElementById("chat-form"),
  messageInput: document.getElementById("message-input"),
  
  rosterPanel: document.getElementById("roster-panel"),
  roomMemberCount: document.getElementById("room-member-count"),
  roomUsersList: document.getElementById("room-users-list"),
  toggleRosterBtn: document.getElementById("toggle-roster-btn"),
  toggleSidebarBtn: document.getElementById("toggle-sidebar-btn"),
  sidebar: document.querySelector(".sidebar")
};

// ==========================================================================
// Initialization & Authentication
// ==========================================================================

// Avatar Picker Selection
elements.avatarPicker.addEventListener("click", (e) => {
  const btn = e.target.closest(".avatar-option");
  if (!btn) return;
  document.querySelectorAll(".avatar-option").forEach((b) => b.classList.remove("selected"));
  btn.classList.add("selected");
  state.currentUser.avatar = btn.dataset.avatar;
});

// User Login Form Submission
elements.loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const username = elements.usernameInput.value.trim();
  if (!username) return;

  state.currentUser.username = username;
  const selectedAvatarBtn = elements.avatarPicker.querySelector(".avatar-option.selected");
  if (selectedAvatarBtn) {
    state.currentUser.avatar = selectedAvatarBtn.dataset.avatar;
  }

  // Emit user login to server
  socket.emit("user:login", {
    username: state.currentUser.username,
    avatar: state.currentUser.avatar
  }, (response) => {
    if (response && response.socketId) {
      state.currentUser.socketId = response.socketId;
      updateUserProfile();
    }
  });

  // Hide login modal
  elements.loginOverlay.classList.add("hidden");
  updateUserProfile();

  // Auto-join default "#general" channel
  joinRoom("general");
});

function updateUserProfile() {
  elements.myAvatarDisplay.textContent = state.currentUser.avatar;
  elements.myUsernameDisplay.textContent = state.currentUser.username;
  if (state.currentUser.socketId) {
    elements.mySocketIdDisplay.textContent = `#${state.currentUser.socketId.substring(0, 6)}`;
  }
}

// ==========================================================================
// Navigation & Room / DM Switching
// ==========================================================================

// Switch Channel
function joinRoom(roomName) {
  if (!roomName) return;
  const cleanRoom = roomName.toLowerCase().replace(/[^a-z0-9_-]/g, "");
  if (!cleanRoom) return;

  // Leave old room if we were in channel mode
  if (state.currentMode === "channel" && state.currentRoom && state.currentRoom !== cleanRoom) {
    socket.emit("room:leave", { room: state.currentRoom });
  }

  // Reset typing state
  resetTyping();

  state.currentMode = "channel";
  state.currentRoom = cleanRoom;
  state.activeDmUser = null;

  // Update UI Navigation Items
  updateActiveNavigation();

  // Update Header
  elements.chatHeaderIcon.textContent = "#";
  elements.chatHeaderTitle.textContent = cleanRoom;
  elements.chatHeaderDesc.textContent = `Channel #${cleanRoom} discussions`;
  elements.messageInput.placeholder = `Message #${cleanRoom}...`;

  // Clear messages pane while new history loads
  elements.messagesContainer.innerHTML = `
    <div class="system-event-message">Joining #${cleanRoom}...</div>
  `;

  // Ensure channel exists in the sidebar list
  ensureChannelInSidebar(cleanRoom);

  // Emit room join to server
  socket.emit("room:join", { room: cleanRoom });
}

// Ensure channel is present in the sidebar button list
function ensureChannelInSidebar(roomName) {
  let existing = elements.roomList.querySelector(`[data-room="${roomName}"]`);
  if (!existing) {
    const btn = document.createElement("button");
    btn.className = "channel-item";
    btn.dataset.room = roomName;
    btn.innerHTML = `<span class="channel-hash">#</span> ${roomName}`;
    btn.addEventListener("click", () => joinRoom(roomName));
    elements.roomList.appendChild(btn);
  }
}

// Channel button click listener (delegation)
elements.roomList.addEventListener("click", (e) => {
  const btn = e.target.closest(".channel-item");
  if (!btn) return;
  const room = btn.dataset.room;
  joinRoom(room);
});

// Create custom room form
elements.createRoomForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const roomName = elements.newRoomInput.value.trim();
  if (roomName) {
    joinRoom(roomName);
    elements.newRoomInput.value = "";
  }
});

// Switch to Direct Message (DM) Thread
function openDirectMessage(targetUser) {
  if (!targetUser || targetUser.socketId === socket.id) return;

  // Reset typing state
  resetTyping();

  state.currentMode = "dm";
  state.activeDmUser = targetUser;

  // Ensure thread entry exists
  if (!state.dmThreads.has(targetUser.socketId)) {
    state.dmThreads.set(targetUser.socketId, {
      user: targetUser,
      messages: [],
      unread: 0
    });
  }

  // Clear unread count for this thread
  const thread = state.dmThreads.get(targetUser.socketId);
  thread.unread = 0;
  updateTotalUnreadBadge();
  renderDmRoster();

  // Update Navigation UI
  updateActiveNavigation();

  // Update Header
  elements.chatHeaderIcon.textContent = targetUser.avatar || "👤";
  elements.chatHeaderTitle.textContent = targetUser.username;
  elements.chatHeaderDesc.textContent = `Direct message with ${targetUser.username}`;
  elements.messageInput.placeholder = `Message @${targetUser.username}...`;

  // Render existing DM history for this conversation
  renderDmHistory(thread.messages);
}

// Update Active Highlights in Navigation
function updateActiveNavigation() {
  // Clear channel active classes
  elements.roomList.querySelectorAll(".channel-item").forEach((btn) => {
    btn.classList.toggle("active", state.currentMode === "channel" && btn.dataset.room === state.currentRoom);
  });

  // Clear DM active classes
  elements.dmList.querySelectorAll(".dm-item").forEach((btn) => {
    const isThisDm = state.currentMode === "dm" && state.activeDmUser && btn.dataset.socketId === state.activeDmUser.socketId;
    btn.classList.toggle("active", Boolean(isThisDm));
  });
}

// ==========================================================================
// Typing Indicator Debounce Logic
// ==========================================================================

elements.messageInput.addEventListener("input", () => {
  if (state.currentMode !== "channel") return; // channel typing indicators

  if (!state.isTyping) {
    state.isTyping = true;
    socket.emit("typing:start", { room: state.currentRoom });
  }

  // Reset Debounce Timer (500ms inactivity triggers typing:stop)
  if (state.typingTimer) {
    clearTimeout(state.typingTimer);
  }

  state.typingTimer = setTimeout(() => {
    resetTyping();
  }, 500);
});

function resetTyping() {
  if (state.isTyping) {
    state.isTyping = false;
    if (state.currentMode === "channel") {
      socket.emit("typing:stop", { room: state.currentRoom });
    }
  }
  if (state.typingTimer) {
    clearTimeout(state.typingTimer);
    state.typingTimer = null;
  }
}

// ==========================================================================
// Message Sending
// ==========================================================================

elements.chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const message = elements.messageInput.value.trim();
  if (!message) return;

  // Immediately stop typing indicator upon sending
  resetTyping();

  if (state.currentMode === "channel") {
    // Dispatch to Room Channel
    socket.emit("chat:send", {
      room: state.currentRoom,
      message: message
    });
  } else if (state.currentMode === "dm" && state.activeDmUser) {
    // Dispatch Direct Message
    socket.emit("direct:send", {
      recipientId: state.activeDmUser.socketId,
      message: message
    });
  }

  // Clear input
  elements.messageInput.value = "";
  elements.messageInput.focus();
});

// ==========================================================================
// Message Rendering Utilities
// ==========================================================================

function appendMessageBubble(msg, isDm = false) {
  const isSelf = msg.sender === state.currentUser.username || 
                 msg.senderSocketId === socket.id || 
                 msg.isSelf === true ||
                 msg.from === "You";

  const row = document.createElement("div");
  row.className = `message-row ${isSelf ? "self" : "other"} ${isDm ? "dm" : ""}`;

  const displayName = isSelf ? "You" : (msg.sender || msg.from);
  const displayAvatar = isSelf ? state.currentUser.avatar : (msg.avatar || msg.fromAvatar || "👤");

  row.innerHTML = `
    <div class="msg-avatar">${displayAvatar}</div>
    <div class="msg-content-wrapper">
      <div class="msg-meta">
        <span class="msg-sender">${escapeHtml(displayName)}</span>
        <span class="msg-time">${msg.timestamp || ""}</span>
      </div>
      <div class="msg-bubble">${escapeHtml(msg.message)}</div>
    </div>
  `;

  elements.messagesContainer.appendChild(row);
  scrollToBottom();
}

function renderDmHistory(messages) {
  elements.messagesContainer.innerHTML = "";
  if (!messages || messages.length === 0) {
    elements.messagesContainer.innerHTML = `
      <div class="system-event-message">
        This is the beginning of your direct message history with ${escapeHtml(state.activeDmUser.username)}.
      </div>
    `;
    return;
  }

  messages.forEach((msg) => appendMessageBubble(msg, true));
  scrollToBottom();
}

function scrollToBottom() {
  elements.messagesContainer.scrollTop = elements.messagesContainer.scrollHeight;
}

function escapeHtml(text) {
  if (!text) return "";
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

// ==========================================================================
// Socket Event Listeners
// ==========================================================================

// Connected to Socket.io Server
socket.on("connect", () => {
  state.currentUser.socketId = socket.id;
  updateUserProfile();
  console.log("Connected with socket ID:", socket.id);
});

// Room History (Server -> Client on room join)
socket.on("room:history", ({ room, messages }) => {
  if (state.currentMode === "channel" && state.currentRoom === room) {
    elements.messagesContainer.innerHTML = "";
    if (!messages || messages.length === 0) {
      elements.messagesContainer.innerHTML = `
        <div class="system-event-message">Welcome to #${escapeHtml(room)}! No messages yet. Say hi! 👋</div>
      `;
      return;
    }

    messages.forEach((msg) => appendMessageBubble(msg, false));
    scrollToBottom();
  }
});

// Group Message Received (Server -> Room)
socket.on("chat:receive", (messageObj) => {
  if (state.currentMode === "channel" && messageObj.room === state.currentRoom) {
    appendMessageBubble(messageObj, false);
  }
});

// Active Users for Current Room (Server -> Room)
socket.on("room:userlist", ({ room, users }) => {
  if (state.currentRoom === room) {
    state.roomUsers = users || [];
    renderRoomRoster();
  }
});

// Global Online Users Directory (Server -> All Clients)
socket.on("users:online", (users) => {
  state.onlineUsers = users || [];
  renderDmRoster();
});

// Typing Update Notification (Server -> Room)
socket.on("typing:update", ({ username, isTyping, room }) => {
  if (state.currentMode !== "channel" || room !== state.currentRoom) return;

  if (isTyping) {
    state.activeTypers.add(username);
  } else {
    state.activeTypers.delete(username);
  }

  renderTypingIndicator();
});

function renderTypingIndicator() {
  const typers = Array.from(state.activeTypers);
  if (typers.length === 0) {
    elements.typingIndicatorBar.classList.remove("visible");
    return;
  }

  let text = "";
  if (typers.length === 1) {
    text = `${escapeHtml(typers[0])} is typing...`;
  } else if (typers.length === 2) {
    text = `${escapeHtml(typers[0])} and ${escapeHtml(typers[1])} are typing...`;
  } else {
    text = `Multiple people are typing...`;
  }

  elements.typingText.textContent = text;
  elements.typingIndicatorBar.classList.add("visible");
}

// Direct Message Received (Server -> Client)
socket.on("direct:receive", (dmPayload) => {
  // Determine partner socket ID & info
  const isOutgoing = dmPayload.isSelf;
  const partnerSocketId = isOutgoing ? dmPayload.toSocketId : dmPayload.fromSocketId;
  const partnerName = isOutgoing ? dmPayload.recipientName : dmPayload.from;
  const partnerAvatar = isOutgoing ? "👤" : (dmPayload.fromAvatar || "👤");

  // Lookup existing or initialize thread
  if (!state.dmThreads.has(partnerSocketId)) {
    state.dmThreads.set(partnerSocketId, {
      user: {
        socketId: partnerSocketId,
        username: partnerName,
        avatar: partnerAvatar
      },
      messages: [],
      unread: 0
    });
  }

  const thread = state.dmThreads.get(partnerSocketId);
  thread.messages.push(dmPayload);

  // If we are currently viewing this DM thread, display immediately
  if (state.currentMode === "dm" && state.activeDmUser && state.activeDmUser.socketId === partnerSocketId) {
    appendMessageBubble(dmPayload, true);
  } else if (!isOutgoing) {
    // Increment unread badge for incoming DM
    thread.unread += 1;
    updateTotalUnreadBadge();
  }

  renderDmRoster();
});

// ==========================================================================
// Roster & UI Renders
// ==========================================================================

function renderRoomRoster() {
  elements.roomMemberCount.textContent = state.roomUsers.length;
  elements.rosterToggleCount.textContent = `${state.roomUsers.length} online`;
  elements.roomUsersList.innerHTML = "";

  state.roomUsers.forEach((u) => {
    const isMe = u.socketId === socket.id;
    const item = document.createElement("div");
    item.className = "roster-user-item";
    item.innerHTML = `
      <div class="roster-avatar">
        ${u.avatar || "👤"}
        <span class="online-dot"></span>
      </div>
      <span class="roster-user-name">${escapeHtml(u.username)}${isMe ? " (You)" : ""}</span>
      ${!isMe ? `<button class="roster-dm-btn" title="Send Direct Message">DM</button>` : ""}
    `;

    if (!isMe) {
      item.addEventListener("click", () => {
        openDirectMessage({
          socketId: u.socketId,
          username: u.username,
          avatar: u.avatar
        });
      });
    }

    elements.roomUsersList.appendChild(item);
  });
}

function renderDmRoster() {
  // Exclude current client from DM list
  const otherUsers = state.onlineUsers.filter((u) => u.socketId !== socket.id);

  if (otherUsers.length === 0) {
    elements.dmList.innerHTML = `<div class="empty-roster-msg">No other users online</div>`;
    return;
  }

  elements.dmList.innerHTML = "";
  otherUsers.forEach((u) => {
    const thread = state.dmThreads.get(u.socketId);
    const unreadCount = thread ? thread.unread : 0;
    const isSelected = state.currentMode === "dm" && state.activeDmUser && state.activeDmUser.socketId === u.socketId;

    const btn = document.createElement("button");
    btn.className = `dm-item ${isSelected ? "active" : ""}`;
    btn.dataset.socketId = u.socketId;
    btn.innerHTML = `
      <span class="dm-avatar">${u.avatar || "👤"}</span>
      <span class="dm-name">${escapeHtml(u.username)}</span>
      ${unreadCount > 0 ? `<span class="dm-unread">${unreadCount}</span>` : ""}
    `;

    btn.addEventListener("click", () => {
      openDirectMessage({
        socketId: u.socketId,
        username: u.username,
        avatar: u.avatar
      });
    });

    elements.dmList.appendChild(btn);
  });
}

function updateTotalUnreadBadge() {
  let total = 0;
  state.dmThreads.forEach((thread) => {
    total += thread.unread || 0;
  });

  if (total > 0) {
    elements.totalUnreadBadge.textContent = total;
    elements.totalUnreadBadge.style.display = "inline-block";
  } else {
    elements.totalUnreadBadge.style.display = "none";
  }
}

// Mobile Toggles
elements.toggleRosterBtn.addEventListener("click", () => {
  elements.rosterPanel.classList.toggle("collapsed");
});

if (elements.toggleSidebarBtn) {
  elements.toggleSidebarBtn.addEventListener("click", () => {
    elements.sidebar.classList.toggle("open");
  });
}
