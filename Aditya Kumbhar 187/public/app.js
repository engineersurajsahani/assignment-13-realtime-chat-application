// Client-side Socket.io & Chat Application logic

const socket = io();

// State
let myUsername = "";
let myAvatar = "🧑‍💻";
let currentRoom = "general";
let onlineUsers = [];
let activeDmRecipient = null; // { socketId, username, avatar }
let typingTimeout = null;
let isTyping = false;

// DOM Elements
const loginModal = document.getElementById("loginModal");
const loginForm = document.getElementById("loginForm");
const usernameInput = document.getElementById("usernameInput");
const avatarOpts = document.querySelectorAll(".avatar-opt");

const myNameEl = document.getElementById("myName");
const myAvatarEl = document.getElementById("myAvatar");
const channelListEl = document.getElementById("channelList");
const newChannelInput = document.getElementById("newChannelInput");
const addChannelBtn = document.getElementById("addChannelBtn");
const onlineUsersListEl = document.getElementById("onlineUsersList");

const currentChatTitleEl = document.getElementById("currentChatTitle");
const chatSubtitleEl = document.getElementById("chatSubtitle");
const rosterAvatarsEl = document.getElementById("rosterAvatars");
const messagesContainer = document.getElementById("messagesContainer");
const typingIndicatorEl = document.getElementById("typingIndicator");
const messageForm = document.getElementById("messageForm");
const messageInput = document.getElementById("messageInput");

// DM Modal Elements
const dmModal = document.getElementById("dmModal");
const dmTargetName = document.getElementById("dmTargetName");
const dmTargetAvatar = document.getElementById("dmTargetAvatar");
const closeDmModalBtn = document.getElementById("closeDmModalBtn");
const dmMessagesContainer = document.getElementById("dmMessagesContainer");
const dmForm = document.getElementById("dmForm");
const dmInput = document.getElementById("dmInput");

// Avatar Picker Selection
avatarOpts.forEach((btn) => {
  btn.addEventListener("click", () => {
    avatarOpts.forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");
    myAvatar = btn.getAttribute("data-avatar");
  });
});

// 1. User Login Submission
loginForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const name = usernameInput.value.trim();
  if (!name) return;

  myUsername = name;
  socket.emit("user:login", {
    username: myUsername,
    avatar: myAvatar
  });
});

// Login Success Handler
socket.on("user:login_success", (userData) => {
  loginModal.classList.add("hidden");
  myNameEl.textContent = userData.username;
  myAvatarEl.textContent = userData.avatar;

  // Auto-join default room: #general
  joinRoom("general");
});

// Join Room Helper
function joinRoom(roomName) {
  currentRoom = roomName;
  currentChatTitleEl.textContent = `# ${roomName}`;
  chatSubtitleEl.textContent = `Channel: #${roomName}`;
  messageInput.placeholder = `Message #${roomName}...`;

  // Update active state in sidebar
  document.querySelectorAll(".channel-item").forEach((el) => {
    if (el.getAttribute("data-room") === roomName) {
      el.classList.add("active");
    } else {
      el.classList.remove("active");
    }
  });

  messagesContainer.innerHTML = "";
  typingIndicatorEl.textContent = "";

  socket.emit("room:join", { room: roomName });
}

// Channel Selection in Sidebar
channelListEl.addEventListener("click", (e) => {
  const item = e.target.closest(".channel-item");
  if (item) {
    const room = item.getAttribute("data-room");
    if (room && room !== currentRoom) {
      joinRoom(room);
    }
  }
});

// Create New Channel
addChannelBtn.addEventListener("click", () => {
  const roomName = newChannelInput.value.trim().toLowerCase().replace(/\s+/g, "-");
  if (!roomName) return;

  // Check if channel already exists
  const existing = document.querySelector(`.channel-item[data-room="${roomName}"]`);
  if (!existing) {
    const li = document.createElement("li");
    li.className = "channel-item";
    li.setAttribute("data-room", roomName);
    li.innerHTML = `<span class="channel-hash">#</span><span class="channel-name">${roomName}</span>`;
    channelListEl.appendChild(li);
  }

  newChannelInput.value = "";
  joinRoom(roomName);
});

// 2. Room History Received from Server
socket.on("room:history", (data) => {
  messagesContainer.innerHTML = "";
  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach((msg) => {
      appendMessage(msg);
    });
  }
  scrollToBottom();
});

// 3. New Message Received
socket.on("chat:receive", (msg) => {
  appendMessage(msg);
  scrollToBottom();
});

// Render Message in DOM
function appendMessage(msg) {
  if (msg.isSystem) {
    const sysDiv = document.createElement("div");
    sysDiv.className = "system-message";
    sysDiv.textContent = `— ${msg.message} (${msg.timestamp}) —`;
    messagesContainer.appendChild(sysDiv);
    return;
  }

  const isMe = msg.sender === myUsername;
  const msgEl = document.createElement("div");
  msgEl.className = `message-item ${isMe ? "is-me" : ""}`;

  msgEl.innerHTML = `
    <div class="message-avatar">${msg.avatar || "👤"}</div>
    <div class="message-body">
      <div class="message-meta">
        <span class="message-sender">${msg.sender}</span>
        <span class="message-time">${msg.timestamp || ""}</span>
      </div>
      <div class="message-text">${escapeHtml(msg.message)}</div>
    </div>
  `;

  messagesContainer.appendChild(msgEl);
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

// 4. Send Message Event
messageForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit("chat:send", {
    room: currentRoom,
    message: text
  });

  // Stop typing immediately upon send
  if (isTyping) {
    isTyping = false;
    clearTimeout(typingTimeout);
    socket.emit("typing:stop", { room: currentRoom });
  }

  messageInput.value = "";
});

// 5. Typing Indicators with Debounce
messageInput.addEventListener("input", () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit("typing:start", { room: currentRoom });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit("typing:stop", { room: currentRoom });
  }, 1500);
});

socket.on("typing:update", (data) => {
  if (data.room === currentRoom && data.username !== myUsername) {
    if (data.isTyping) {
      typingIndicatorEl.textContent = `${data.username} is typing...`;
    } else {
      typingIndicatorEl.textContent = "";
    }
  }
});

// 6. Room User List Update (Roster)
socket.on("room:userlist", (data) => {
  if (data.room === currentRoom) {
    rosterAvatarsEl.innerHTML = "";
    data.users.forEach((u) => {
      const badge = document.createElement("span");
      badge.className = "roster-badge";
      badge.textContent = `${u.avatar} ${u.username}`;
      rosterAvatarsEl.appendChild(badge);
    });
  }
});

// 7. Global Online Users List (for DMs)
socket.on("users:online", (users) => {
  onlineUsers = users;
  onlineUsersListEl.innerHTML = "";

  users.forEach((u) => {
    if (u.socketId === socket.id) return; // Don't list self in DM target list

    const li = document.createElement("li");
    li.className = "user-item";
    li.innerHTML = `
      <div class="user-item-left">
        <span>${u.avatar || "👤"}</span>
        <span>${u.username}</span>
      </div>
      <button class="dm-btn" data-socket-id="${u.socketId}" data-username="${u.username}" data-avatar="${u.avatar || "👤"}">💬 DM</button>
    `;
    onlineUsersListEl.appendChild(li);
  });
});

// 8. Direct Messaging Flow
onlineUsersListEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".dm-btn");
  if (btn) {
    const socketId = btn.getAttribute("data-socket-id");
    const username = btn.getAttribute("data-username");
    const avatar = btn.getAttribute("data-avatar");

    activeDmRecipient = { socketId, username, avatar };
    dmTargetName.textContent = `Direct Message with ${username}`;
    dmTargetAvatar.textContent = avatar;
    dmMessagesContainer.innerHTML = "";
    dmModal.classList.remove("hidden");
    dmInput.focus();
  }
});

closeDmModalBtn.addEventListener("click", () => {
  dmModal.classList.add("hidden");
  activeDmRecipient = null;
});

dmForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !activeDmRecipient) return;

  socket.emit("direct:send", {
    recipientId: activeDmRecipient.socketId,
    message: text
  });

  dmInput.value = "";
});

// Receive DM
socket.on("direct:receive", (dm) => {
  // If DM modal is currently open with this user or we sent it
  if (
    activeDmRecipient &&
    (dm.fromId === activeDmRecipient.socketId || dm.toId === activeDmRecipient.socketId)
  ) {
    const isMe = dm.from === myUsername;
    const msgDiv = document.createElement("div");
    msgDiv.className = `message-item ${isMe ? "is-me" : ""}`;
    msgDiv.innerHTML = `
      <div class="message-avatar">${dm.fromAvatar || "👤"}</div>
      <div class="message-body">
        <div class="message-meta">
          <span class="message-sender">${dm.from}</span>
          <span class="message-time">${dm.timestamp}</span>
        </div>
        <div class="message-text">${escapeHtml(dm.message)}</div>
      </div>
    `;
    dmMessagesContainer.appendChild(msgDiv);
    dmMessagesContainer.scrollTop = dmMessagesContainer.scrollHeight;
  } else if (dm.from !== myUsername) {
    // Show notification alert / prompt
    alert(`💬 New DM from ${dm.from}: "${dm.message}"`);
  }
});
