// public/app.js
// Configuration constants
const TYPING_DEBOUNCE_MS = 2000;

// Application State
let currentRoom = 'general';
let myUsername = '';
let myAvatar = '🚀';
let mySocketId = '';
let isCurrentlyTyping = false;
let typingTimer = null;
const typingUsers = new Set();

// DM State: socketId -> { username, avatar, messages: Array }
const dmStore = new Map();
let activeDmRecipient = null; // { socketId, username, avatar }

// Socket.io initialization
const socket = io();

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPicker = document.getElementById('avatar-picker');
const appContainer = document.getElementById('app-container');

const myAvatarEl = document.getElementById('my-avatar');
const myUsernameEl = document.getElementById('my-username');
const mySocketIdEl = document.getElementById('my-socket-id');
const connectionStatusEl = document.getElementById('connection-status');

const roomListEl = document.getElementById('room-list');
const currentRoomNameEl = document.getElementById('current-room-name');
const currentRoomDescEl = document.getElementById('current-room-desc');
const headerMemberCountEl = document.getElementById('header-member-count');
const userCountBadgeEl = document.getElementById('user-count-badge');
const roomUserListEl = document.getElementById('room-user-list');

const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const chatInput = document.getElementById('chat-input');
const typingIndicatorBar = document.getElementById('typing-indicator-bar');
const typingTextEl = document.getElementById('typing-text');

const dmModal = document.getElementById('dm-modal');
const closeDmBtn = document.getElementById('close-dm-btn');
const dmModalAvatar = document.getElementById('dm-modal-avatar');
const dmModalUsername = document.getElementById('dm-modal-username');
const dmMessagesContainer = document.getElementById('dm-messages-container');
const dmForm = document.getElementById('dm-form');
const dmInput = document.getElementById('dm-input');
const dmConversationsList = document.getElementById('dm-conversations-list');
const toastContainer = document.getElementById('toast-container');

// Room Descriptions Mapping
const roomDescriptions = {
  general: 'Public lobby for everyone on the platform',
  developers: 'Technical discussions, code sharing & bug hunts',
  random: 'Casual banter, fun topics & watercooler chats'
};

// ==========================================
// Helper Functions
// ==========================================

/**
 * Escapes HTML characters to prevent XSS.
 */
function escapeHtml(str) {
  if (!str) return '';
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

/**
 * Displays a toast notification.
 */
function showToast(message, type = 'info') {
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.textContent = message;
  toastContainer.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateY(10px)';
    setTimeout(() => toast.remove(), 250);
  }, 3500);
}

/**
 * Shared message rendering function used for both room messages and direct messages.
 * Single source of truth for chat bubble rendering.
 * @param {HTMLElement} container - The DOM container to append to
 * @param {Object} messageObj - Message details { sender, avatar, message, timestamp }
 * @param {boolean} isOwnMessage - True if the message was sent by the local user
 */
function renderMessage(container, messageObj, isOwnMessage) {
  const wrapper = document.createElement('div');
  wrapper.className = `msg-wrapper ${isOwnMessage ? 'own' : ''}`;

  const senderName = isOwnMessage ? 'You' : escapeHtml(messageObj.sender || 'Anonymous');
  const avatarText = escapeHtml(messageObj.avatar || '👤');
  const msgText = escapeHtml(messageObj.message || '');
  const timeText = escapeHtml(messageObj.timestamp || '');

  wrapper.innerHTML = `
    <div class="msg-avatar">${avatarText}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <span class="msg-sender">${senderName}</span>
        <span class="msg-time">${timeText}</span>
      </div>
      <div class="msg-bubble">${msgText}</div>
    </div>
  `;

  container.appendChild(wrapper);
  container.scrollTop = container.scrollHeight;
}

/**
 * Updates the typing indicator text and visibility.
 * Gracefully formats multiple typists (e.g., "Aarav and Priya are typing...").
 */
function updateTypingBanner() {
  const typists = Array.from(typingUsers);
  if (typists.length === 0) {
    typingIndicatorBar.classList.remove('visible');
    typingTextEl.textContent = '';
  } else {
    typingIndicatorBar.classList.add('visible');
    if (typists.length === 1) {
      typingTextEl.textContent = `${typists[0]} is typing...`;
    } else if (typists.length === 2) {
      typingTextEl.textContent = `${typists[0]} and ${typists[1]} are typing...`;
    } else {
      typingTextEl.textContent = `${typists[0]}, ${typists[1]} and ${typists.length - 2} other(s) are typing...`;
    }
  }
}

/**
 * Re-renders the Direct Messages list in the left sidebar.
 */
function renderDmSidebarList() {
  dmConversationsList.innerHTML = '';

  if (dmStore.size === 0) {
    dmConversationsList.innerHTML = '<div class="empty-dms-hint">Click a user in the room list to send a private DM.</div>';
    return;
  }

  dmStore.forEach((data, socketId) => {
    const item = document.createElement('div');
    item.className = 'dm-item';
    const lastMsg = data.messages[data.messages.length - 1];
    const lastMsgPreview = lastMsg ? (lastMsg.isOwn ? `You: ${lastMsg.message}` : lastMsg.message) : 'No messages yet';

    item.innerHTML = `
      <span class="dm-avatar">${escapeHtml(data.avatar)}</span>
      <div class="dm-user-details">
        <div class="dm-user-name">${escapeHtml(data.username)}</div>
        <div class="dm-last-msg">${escapeHtml(lastMsgPreview)}</div>
      </div>
      ${data.unread > 0 ? `<span class="dm-unread-badge">${data.unread}</span>` : ''}
    `;

    item.addEventListener('click', () => {
      openDmModal({
        socketId,
        username: data.username,
        avatar: data.avatar
      });
    });

    dmConversationsList.appendChild(item);
  });
}

/**
 * Opens the Direct Message modal for a specific user.
 */
function openDmModal(user) {
  if (user.socketId === socket.id) {
    showToast("You cannot direct message yourself.", "info");
    return;
  }

  activeDmRecipient = user;

  // Initialize or fetch DM store
  if (!dmStore.has(user.socketId)) {
    dmStore.set(user.socketId, {
      username: user.username,
      avatar: user.avatar,
      messages: [],
      unread: 0
    });
  }

  const convo = dmStore.get(user.socketId);
  convo.unread = 0; // Clear unread on open
  renderDmSidebarList();

  // Populate modal header
  dmModalAvatar.textContent = user.avatar;
  dmModalUsername.textContent = user.username;

  // Render existing conversation messages
  dmMessagesContainer.innerHTML = '';
  convo.messages.forEach(msg => {
    renderMessage(dmMessagesContainer, msg, msg.isOwn);
  });

  dmModal.classList.remove('hidden');
  dmInput.value = '';
  dmInput.focus();
}

/**
 * Closes the Direct Message modal.
 */
function closeDmModal() {
  dmModal.classList.add('hidden');
  activeDmRecipient = null;
}

// ==========================================
// Event Listeners: UI Interactions
// ==========================================

// Avatar Picker Selection
avatarPicker.addEventListener('click', (e) => {
  const option = e.target.closest('.avatar-option');
  if (!option) return;
  document.querySelectorAll('.avatar-option').forEach(btn => btn.classList.remove('selected'));
  option.classList.add('selected');
  myAvatar = option.dataset.avatar;
});

// Login Form Submit
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) {
    showToast('Please enter a username.', 'error');
    return;
  }

  myUsername = username;
  myAvatarEl.textContent = myAvatar;
  myUsernameEl.textContent = myUsername;

  // Emit user:login event to the server
  socket.emit('user:login', { username: myUsername, avatar: myAvatar });

  // Hide login modal and show main application layout
  loginModal.classList.add('hidden');
  appContainer.classList.remove('hidden');

  // Join the default general room
  switchRoom('general');
});

// Room Tab Switching
function switchRoom(newRoom) {
  if (currentRoom === newRoom && messagesContainer.children.length > 0) return;

  // Reset local typing indicator state for the leaving room
  if (isCurrentlyTyping) {
    clearTimeout(typingTimer);
    socket.emit('typing:stop', { room: currentRoom });
    isCurrentlyTyping = false;
  }

  typingUsers.clear();
  updateTypingBanner();

  // Emit room:leave for current room if any
  if (currentRoom) {
    socket.emit('room:leave', { room: currentRoom });
  }

  currentRoom = newRoom;

  // Update UI active room tabs
  document.querySelectorAll('.channel-item').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.room === newRoom);
  });

  // Update Room Header UI
  currentRoomNameEl.textContent = newRoom;
  currentRoomDescEl.textContent = roomDescriptions[newRoom] || 'Discussion Room';
  chatInput.placeholder = `Message #${newRoom}...`;

  // Emit room:join for new room
  socket.emit('room:join', { room: newRoom });
  chatInput.focus();
}

roomListEl.addEventListener('click', (e) => {
  const roomBtn = e.target.closest('.channel-item');
  if (!roomBtn) return;
  const targetRoom = roomBtn.dataset.room;
  if (targetRoom) {
    switchRoom(targetRoom);
  }
});

// Typing Debounce Handling on Chat Input
chatInput.addEventListener('input', () => {
  if (!currentRoom) return;

  // 1. Emit typing:start immediately on first stroke
  if (!isCurrentlyTyping) {
    socket.emit('typing:start', { room: currentRoom });
    isCurrentlyTyping = true;
  }

  // 2. Reset debounce timer on every keystroke
  clearTimeout(typingTimer);
  typingTimer = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
    isCurrentlyTyping = false;
  }, TYPING_DEBOUNCE_MS);
});

// Room Chat Form Submission
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = chatInput.value.trim();
  if (!text) return;

  // 3. On message send, immediately stop typing and clear timer
  clearTimeout(typingTimer);
  if (isCurrentlyTyping) {
    socket.emit('typing:stop', { room: currentRoom });
    isCurrentlyTyping = false;
  }

  // Emit chat:send to the server
  socket.emit('chat:send', {
    room: currentRoom,
    message: text
  });

  chatInput.value = '';
  chatInput.focus();
});

// DM Modal Close Handlers
closeDmBtn.addEventListener('click', closeDmModal);
dmModal.addEventListener('click', (e) => {
  if (e.target === dmModal) closeDmModal();
});

// Direct Message Form Submit
dmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !activeDmRecipient) return;

  socket.emit('direct:send', {
    recipientId: activeDmRecipient.socketId,
    message: text
  });

  dmInput.value = '';
  dmInput.focus();
});

// ==========================================
// Socket.io Event Listeners (Incoming)
// ==========================================

// Connection status updates
socket.on('connect', () => {
  mySocketId = socket.id;
  mySocketIdEl.textContent = `ID: ${socket.id.substring(0, 8)}...`;
  connectionStatusEl.innerHTML = '<span class="status-indicator online"></span><span class="status-text">Online</span>';
});

socket.on('disconnect', () => {
  connectionStatusEl.innerHTML = '<span class="status-indicator offline"></span><span class="status-text">Offline</span>';
});

// Login confirmation
socket.on('user:login:success', (data) => {
  mySocketId = data.socketId;
  mySocketIdEl.textContent = `ID: ${data.socketId.substring(0, 8)}...`;
});

// Room message history received
socket.on('room:history', (data) => {
  const { room, messages } = data || {};
  if (room !== currentRoom) return;

  messagesContainer.innerHTML = '';

  if (!messages || messages.length === 0) {
    const welcome = document.createElement('div');
    welcome.className = 'msg-system';
    welcome.textContent = `Welcome to #${room}! Send a message to start the conversation.`;
    messagesContainer.appendChild(welcome);
  } else {
    messages.forEach(msg => {
      renderMessage(messagesContainer, msg, msg.sender === myUsername);
    });
  }

  messagesContainer.scrollTop = messagesContainer.scrollHeight;
});

// Real-time room message received
socket.on('chat:receive', (messageObj) => {
  renderMessage(messagesContainer, messageObj, messageObj.sender === myUsername);
});

// Updated user list for the room
socket.on('room:userlist', (data) => {
  const { room, users } = data || {};
  if (room !== currentRoom) return;

  const count = users ? users.length : 0;
  headerMemberCountEl.textContent = `${count} ${count === 1 ? 'user' : 'users'} here`;
  userCountBadgeEl.textContent = count;

  roomUserListEl.innerHTML = '';

  if (!users || users.length === 0) {
    roomUserListEl.innerHTML = '<div class="empty-dms-hint">No active users in room.</div>';
    return;
  }

  users.forEach(user => {
    const isSelf = user.socketId === socket.id;
    const userItem = document.createElement('div');
    userItem.className = 'user-item';
    userItem.title = isSelf ? 'Your profile' : `Click to send DM to ${user.username}`;

    userItem.innerHTML = `
      <div class="user-item-left">
        <span class="user-item-avatar">${escapeHtml(user.avatar || '👤')}</span>
        <span class="user-item-name ${isSelf ? 'is-self' : ''}">${escapeHtml(user.username)} ${isSelf ? '(You)' : ''}</span>
      </div>
      ${!isSelf ? '<span class="user-item-badge">DM</span>' : ''}
    `;

    if (!isSelf) {
      userItem.addEventListener('click', () => {
        openDmModal(user);
      });
    }

    roomUserListEl.appendChild(userItem);
  });
});

// Real-time typing indicators in room
socket.on('typing:update', (data) => {
  const { username, isTyping } = data || {};
  if (!username) return;

  if (isTyping) {
    typingUsers.add(username);
  } else {
    typingUsers.delete(username);
  }

  updateTypingBanner();
});

// Direct Message confirmation (Sent by local user)
socket.on('direct:sent', (data) => {
  const { toId, toUsername, avatar, message, timestamp } = data;

  if (!dmStore.has(toId)) {
    dmStore.set(toId, {
      username: toUsername,
      avatar: avatar || '👤',
      messages: [],
      unread: 0
    });
  }

  const convo = dmStore.get(toId);
  const msgObj = {
    sender: myUsername,
    avatar: myAvatar,
    message,
    timestamp,
    isOwn: true
  };

  convo.messages.push(msgObj);

  if (activeDmRecipient && activeDmRecipient.socketId === toId) {
    renderMessage(dmMessagesContainer, msgObj, true);
  }

  renderDmSidebarList();
});

// Direct Message received from another user
socket.on('direct:receive', (data) => {
  const { from, fromId, avatar, message, timestamp } = data;

  if (!dmStore.has(fromId)) {
    dmStore.set(fromId, {
      username: from,
      avatar: avatar || '👤',
      messages: [],
      unread: 0
    });
  }

  const convo = dmStore.get(fromId);
  // Update username / avatar in case it changed
  convo.username = from;
  convo.avatar = avatar || '👤';

  const msgObj = {
    sender: from,
    avatar: avatar || '👤',
    message,
    timestamp,
    isOwn: false
  };

  convo.messages.push(msgObj);

  // If DM modal is currently open with this user, render immediately
  if (activeDmRecipient && activeDmRecipient.socketId === fromId) {
    renderMessage(dmMessagesContainer, msgObj, false);
  } else {
    convo.unread += 1;
    showToast(`📩 New DM from ${from}: ${message}`, 'info');
  }

  renderDmSidebarList();
});

// Error handling from server
socket.on('error', (err) => {
  const message = (err && err.message) ? err.message : 'An error occurred.';
  showToast(message, 'error');
});
