// Client Socket Initialization
const socket = io();

// State Management
const state = {
  currentUser: {
    username: '',
    avatar: 'avatar1.png',
    socketId: ''
  },
  currentRoom: 'general',
  isTyping: false,
  typingTimeout: null,
  activeTypingUsers: new Set(),
  dmStore: {}, // recipientSocketId -> Array of DM objects
  activeDmTarget: null // user object { socketId, username, avatar }
};

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');

const appContainer = document.getElementById('app-container');
const currentUserNameEl = document.getElementById('current-user-name');
const currentUserSocketEl = document.getElementById('current-user-socket');
const currentUserAvatarEl = document.getElementById('current-user-avatar');

const roomItems = document.querySelectorAll('.room-list .room-item');
const roomListContainer = document.querySelector('.room-list');
const customRoomInput = document.getElementById('custom-room-input');
const joinCustomRoomBtn = document.getElementById('join-custom-room-btn');

const roomUserListEl = document.getElementById('room-user-list');
const roomUserCountEl = document.getElementById('room-user-count');
const allUserListEl = document.getElementById('all-user-list');

const currentRoomTitleEl = document.getElementById('current-room-title');
const currentRoomSubtitleEl = document.getElementById('current-room-subtitle');
const messagesContainer = document.getElementById('messages-container');

const typingBar = document.getElementById('typing-bar');
const typingText = document.getElementById('typing-text');

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

// DM Modal Elements
const dmModal = document.getElementById('dm-modal');
const openDmModalBtn = document.getElementById('open-dm-modal-btn');
const closeDmModalBtn = document.getElementById('close-dm-modal-btn');
const dmNotificationBadge = document.getElementById('dm-notification-badge');
const dmUserSelectList = document.getElementById('dm-user-select-list');
const dmTargetInfo = document.getElementById('dm-target-info');
const dmMessagesContainer = document.getElementById('dm-messages-container');
const dmForm = document.getElementById('dm-form');
const dmInput = document.getElementById('dm-input');

// Avatar Icons Map
const avatarIcons = {
  'avatar1.png': '<i class="fa-solid fa-robot"></i>',
  'avatar2.png': '<i class="fa-solid fa-user-ninja"></i>',
  'avatar3.png': '<i class="fa-solid fa-user-astronaut"></i>',
  'avatar4.png': '<i class="fa-solid fa-ghost"></i>',
  'avatar5.png': '<i class="fa-solid fa-cat"></i>'
};

/* ==========================================================================
   SOCKET EVENT LISTENERS
   ========================================================================== */

socket.on('connect', () => {
  state.currentUser.socketId = socket.id;
  if (currentUserSocketEl) {
    currentUserSocketEl.innerText = `ID: ${socket.id.substring(0, 8)}...`;
  }
});

socket.on('user:login_success', (data) => {
  if (data.user) {
    state.currentUser = { ...state.currentUser, ...data.user };
  }
});

socket.on('room:history', (data) => {
  const { room, messages } = data || {};
  if (room === state.currentRoom) {
    renderRoomHistory(messages);
  }
});

socket.on('room:userlist', (data) => {
  const { room, users } = data || {};
  if (room === state.currentRoom) {
    renderRoomUsers(users);
  }
});

socket.on('users:all', (data) => {
  const { users } = data || {};
  renderAllOnlineUsers(users);
});

socket.on('chat:receive', (msgObj) => {
  if (msgObj.room === state.currentRoom) {
    appendMessage(msgObj);
  }
});

socket.on('typing:update', (data) => {
  const { username, isTyping, room } = data || {};
  if (room === state.currentRoom) {
    if (isTyping) {
      state.activeTypingUsers.add(username);
    } else {
      state.activeTypingUsers.delete(username);
    }
    updateTypingIndicator();
  }
});

socket.on('direct:receive', (dmObj) => {
  const senderId = dmObj.senderId;
  if (!state.dmStore[senderId]) {
    state.dmStore[senderId] = [];
  }
  state.dmStore[senderId].push(dmObj);

  // If DM modal is open and active on this sender
  if (!dmModal.classList.contains('hidden') && state.activeDmTarget && state.activeDmTarget.socketId === senderId) {
    renderDmMessages(senderId);
  } else {
    // Show unread notification badge
    dmNotificationBadge.classList.remove('hidden');
  }
});

socket.on('direct:sent_confirm', (dmObj) => {
  const recipientId = dmObj.recipientId;
  if (!state.dmStore[recipientId]) {
    state.dmStore[recipientId] = [];
  }
  state.dmStore[recipientId].push(dmObj);

  if (state.activeDmTarget && state.activeDmTarget.socketId === recipientId) {
    renderDmMessages(recipientId);
  }
});

/* ==========================================================================
   INITIALIZATION & FORM HANDLERS
   ========================================================================== */

// LOGIN FORM SUBMISSION
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  const avatarEl = document.querySelector('input[name="avatar"]:checked');
  const avatar = avatarEl ? avatarEl.value : 'avatar1.png';

  if (!username) return;

  state.currentUser.username = username;
  state.currentUser.avatar = avatar;

  // Render User Profile Sidebar
  currentUserNameEl.innerText = username;
  currentUserAvatarEl.className = 'profile-avatar';
  currentUserAvatarEl.innerHTML = avatarIcons[avatar] || '<i class="fa-solid fa-user"></i>';

  // Emit user:login event to socket server
  socket.emit('user:login', { username, avatar });

  // Hide Login Modal & Show App
  loginModal.classList.add('hidden');
  appContainer.classList.remove('hidden');

  // Join initial room (#general)
  joinRoom(state.currentRoom);
});

// ROOM SWITCHING VIA SIDEBAR
document.addEventListener('click', (e) => {
  const roomItem = e.target.closest('.room-item');
  if (roomItem) {
    const targetRoom = roomItem.getAttribute('data-room');
    if (targetRoom && targetRoom !== state.currentRoom) {
      joinRoom(targetRoom);
    }
  }
});

// CUSTOM ROOM CREATION
joinCustomRoomBtn.addEventListener('click', () => {
  const roomName = customRoomInput.value.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
  if (roomName) {
    addCustomRoomToSidebar(roomName);
    joinRoom(roomName);
    customRoomInput.value = '';
  }
});

customRoomInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') {
    e.preventDefault();
    joinCustomRoomBtn.click();
  }
});

function addCustomRoomToSidebar(roomName) {
  const existing = document.querySelector(`.room-item[data-room="${roomName}"]`);
  if (!existing) {
    const li = document.createElement('li');
    li.className = 'room-item';
    li.setAttribute('data-room', roomName);
    li.innerHTML = `<i class="fa-solid fa-hashtag"></i> ${roomName}`;
    roomListContainer.appendChild(li);
  }
}

function joinRoom(roomName) {
  // Stop typing state in old room
  if (state.isTyping) {
    stopTyping();
  }
  state.activeTypingUsers.clear();
  updateTypingIndicator();

  // Update room state
  state.currentRoom = roomName;

  // Update UI sidebar active highlight
  document.querySelectorAll('.room-item').forEach(item => {
    if (item.getAttribute('data-room') === roomName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Update Header Title
  currentRoomTitleEl.innerText = roomName;
  currentRoomSubtitleEl.innerText = `Active group channel #${roomName}`;
  messageInput.placeholder = `Message #${roomName}...`;

  // Emit room:join event
  socket.emit('room:join', { room: roomName });
}

/* ==========================================================================
   CHAT MESSAGING & DEBOUNCED TYPING INDICATORS
   ========================================================================== */

// CHAT MESSAGE SUBMISSION
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  // Stop typing state
  stopTyping();

  // Emit chat:send event
  socket.emit('chat:send', {
    room: state.currentRoom,
    message: text
  });

  messageInput.value = '';
});

// DEBOUNCED TYPING INDICATOR
messageInput.addEventListener('input', () => {
  if (!state.isTyping) {
    state.isTyping = true;
    socket.emit('typing:start', { room: state.currentRoom });
  }

  // Clear existing debounce timer
  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
  }

  // Set 800ms debounce timeout to stop typing indicator
  state.typingTimeout = setTimeout(() => {
    stopTyping();
  }, 800);
});

function stopTyping() {
  if (state.isTyping) {
    state.isTyping = false;
    socket.emit('typing:stop', { room: state.currentRoom });
  }
  if (state.typingTimeout) {
    clearTimeout(state.typingTimeout);
    state.typingTimeout = null;
  }
}

function updateTypingIndicator() {
  const usersArray = Array.from(state.activeTypingUsers).filter(u => u !== state.currentUser.username);
  if (usersArray.length === 0) {
    typingBar.classList.remove('visible');
  } else {
    typingBar.classList.add('visible');
    if (usersArray.length === 1) {
      typingText.innerText = `${usersArray[0]} is typing...`;
    } else if (usersArray.length === 2) {
      typingText.innerText = `${usersArray[0]} and ${usersArray[1]} are typing...`;
    } else {
      typingText.innerText = `${usersArray.length} people are typing...`;
    }
  }
}

/* ==========================================================================
   UI RENDERING FUNCTIONS
   ========================================================================== */

function renderRoomHistory(messages) {
  messagesContainer.innerHTML = '';
  
  const historyBanner = document.createElement('div');
  historyBanner.className = 'history-banner';
  historyBanner.innerHTML = `<i class="fa-solid fa-clock-rotate-left"></i> Loaded recent message history (${messages.length} messages)`;
  messagesContainer.appendChild(historyBanner);

  messages.forEach(msg => {
    appendMessage(msg, false);
  });

  scrollToBottom(messagesContainer);
}

function appendMessage(msgObj, shouldScroll = true) {
  const isOwn = msgObj.sender === state.currentUser.username;
  const msgRow = document.createElement('div');
  msgRow.className = `message-row ${isOwn ? 'own' : ''}`;

  const iconHtml = avatarIcons[msgObj.avatar] || '<i class="fa-solid fa-user"></i>';

  msgRow.innerHTML = `
    <div class="msg-avatar ${getAvatarBgClass(msgObj.avatar)}">
      ${iconHtml}
    </div>
    <div class="msg-content-wrapper">
      <div class="msg-meta">
        <span class="msg-sender">${escapeHtml(msgObj.sender)}</span>
        <span class="msg-time">${msgObj.timestamp || ''}</span>
      </div>
      <div class="msg-bubble">
        ${escapeHtml(msgObj.message)}
      </div>
    </div>
  `;

  messagesContainer.appendChild(msgRow);

  if (shouldScroll) {
    scrollToBottom(messagesContainer);
  }
}

function renderRoomUsers(users) {
  roomUserCountEl.innerText = users.length;
  roomUserListEl.innerHTML = '';

  users.forEach(user => {
    const li = document.createElement('li');
    li.className = 'user-item';
    const isSelf = user.socketId === socket.id;
    li.innerHTML = `
      <div class="user-item-left">
        <span class="user-dot"></span>
        <span>${escapeHtml(user.username)} ${isSelf ? '(You)' : ''}</span>
      </div>
      ${!isSelf ? `<button class="btn-dm-mini" onclick="openDirectMessageWith('${user.socketId}', '${escapeHtml(user.username)}', '${user.avatar}')"><i class="fa-solid fa-paper-plane"></i> DM</button>` : ''}
    `;
    roomUserListEl.appendChild(li);
  });
}

function renderAllOnlineUsers(users) {
  allUserListEl.innerHTML = '';
  dmUserSelectList.innerHTML = '';

  users.forEach(user => {
    const isSelf = user.socketId === socket.id;
    
    // Sidebar list
    const li = document.createElement('li');
    li.className = 'user-item';
    li.innerHTML = `
      <div class="user-item-left">
        <span class="user-dot"></span>
        <span>${escapeHtml(user.username)} ${isSelf ? '(You)' : ''}</span>
      </div>
      ${!isSelf ? `<button class="btn-dm-mini" onclick="openDirectMessageWith('${user.socketId}', '${escapeHtml(user.username)}', '${user.avatar}')"><i class="fa-solid fa-paper-plane"></i> DM</button>` : ''}
    `;
    allUserListEl.appendChild(li);

    // DM Modal User List
    if (!isSelf) {
      const dmLi = document.createElement('li');
      dmLi.className = `dm-user-item ${state.activeDmTarget && state.activeDmTarget.socketId === user.socketId ? 'active' : ''}`;
      dmLi.innerHTML = `
        <span class="user-dot"></span>
        <span>${escapeHtml(user.username)}</span>
      `;
      dmLi.addEventListener('click', () => {
        selectDmTarget(user);
      });
      dmUserSelectList.appendChild(dmLi);
    }
  });
}

/* ==========================================================================
   DIRECT MESSAGING MODAL & LOGIC
   ========================================================================== */

openDmModalBtn.addEventListener('click', () => {
  dmModal.classList.remove('hidden');
  dmNotificationBadge.classList.add('hidden');
});

closeDmModalBtn.addEventListener('click', () => {
  dmModal.classList.add('hidden');
});

window.openDirectMessageWith = function(socketId, username, avatar) {
  dmModal.classList.remove('hidden');
  dmNotificationBadge.classList.add('hidden');
  selectDmTarget({ socketId, username, avatar });
};

function selectDmTarget(user) {
  state.activeDmTarget = user;
  
  // Highlight active target in DM user list
  document.querySelectorAll('.dm-user-item').forEach(item => {
    if (item.innerText.includes(user.username)) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  dmTargetInfo.innerHTML = `
    <strong><i class="fa-solid fa-lock"></i> Direct Message with ${escapeHtml(user.username)}</strong>
    <span style="font-size:0.75rem; display:block; color:var(--text-muted);">Socket ID: ${user.socketId}</span>
  `;

  dmForm.classList.remove('hidden');
  renderDmMessages(user.socketId);
}

function renderDmMessages(socketId) {
  dmMessagesContainer.innerHTML = '';
  const messages = state.dmStore[socketId] || [];

  if (messages.length === 0) {
    dmMessagesContainer.innerHTML = '<div class="history-banner">No private messages yet. Say hello!</div>';
    return;
  }

  messages.forEach(msg => {
    const isOwn = msg.senderId === socket.id || msg.from === state.currentUser.username;
    const msgRow = document.createElement('div');
    msgRow.className = `message-row ${isOwn ? 'own' : ''}`;

    msgRow.innerHTML = `
      <div class="msg-content-wrapper">
        <div class="msg-meta">
          <span class="msg-sender">${escapeHtml(msg.from)}</span>
          <span class="msg-time">${msg.timestamp || ''}</span>
        </div>
        <div class="msg-bubble">
          ${escapeHtml(msg.message)}
        </div>
      </div>
    `;

    dmMessagesContainer.appendChild(msgRow);
  });

  scrollToBottom(dmMessagesContainer);
}

dmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !state.activeDmTarget) return;

  socket.emit('direct:send', {
    recipientId: state.activeDmTarget.socketId,
    message: text
  });

  dmInput.value = '';
});

/* ==========================================================================
   UTILITY HELPERS
   ========================================================================== */

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

function getAvatarBgClass(avatarName) {
  switch (avatarName) {
    case 'avatar1.png': return 'avatar-1';
    case 'avatar2.png': return 'avatar-2';
    case 'avatar3.png': return 'avatar-3';
    case 'avatar4.png': return 'avatar-4';
    case 'avatar5.png': return 'avatar-5';
    default: return 'avatar-1';
  }
}

function escapeHtml(str) {
  return String(str || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
