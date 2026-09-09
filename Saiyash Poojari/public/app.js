const AVATAR_MAP = {
  avatar1: `<svg viewBox="0 0 36 36" fill="none" class="avatar-svg"><circle cx="18" cy="18" r="18" fill="#4F46E5"/><path d="M18 8C14.134 8 11 11.134 11 15C11 18.866 14.134 22 18 22C21.866 22 25 18.866 25 15C25 11.134 21.866 8 18 8ZM18 24C12.67 24 8 26.67 8 30V32H28V30C28 26.67 23.33 24 18 24Z" fill="#FFFFFF"/></svg>`,
  avatar2: `<svg viewBox="0 0 36 36" fill="none" class="avatar-svg"><circle cx="18" cy="18" r="18" fill="#06B6D4"/><path d="M18 8C14.134 8 11 11.134 11 15C11 18.866 14.134 22 18 22C21.866 22 25 18.866 25 15C25 11.134 21.866 8 18 8ZM18 24C12.67 24 8 26.67 8 30V32H28V30C28 26.67 23.33 24 18 24Z" fill="#FFFFFF"/></svg>`,
  avatar3: `<svg viewBox="0 0 36 36" fill="none" class="avatar-svg"><circle cx="18" cy="18" r="18" fill="#10B981"/><path d="M18 8C14.134 8 11 11.134 11 15C11 18.866 14.134 22 18 22C21.866 22 25 18.866 25 15C25 11.134 21.866 8 18 8ZM18 24C12.67 24 8 26.67 8 30V32H28V30C28 26.67 23.33 24 18 24Z" fill="#FFFFFF"/></svg>`,
  avatar4: `<svg viewBox="0 0 36 36" fill="none" class="avatar-svg"><circle cx="18" cy="18" r="18" fill="#F59E0B"/><path d="M18 8C14.134 8 11 11.134 11 15C11 18.866 14.134 22 18 22C21.866 22 25 18.866 25 15C25 11.134 21.866 8 18 8ZM18 24C12.67 24 8 26.67 8 30V32H28V30C28 26.67 23.33 24 18 24Z" fill="#FFFFFF"/></svg>`
};

function getAvatarSVG(key) {
  return AVATAR_MAP[key] || AVATAR_MAP.avatar1;
}

let socket = null;
let currentUser = {
  username: '',
  avatar: 'avatar1',
  socketId: ''
};

let currentMode = 'room';
let activeRoom = 'general';
let activeDmRecipient = null;
let onlineUsersList = [];

const dmHistories = {};

let isTypingState = false;
let typingTimeout = null;
const TYPING_DEBOUNCE_MS = 600;

const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPicker = document.getElementById('avatar-picker');
const appContainer = document.getElementById('app-container');

const myAvatarContainer = document.getElementById('my-avatar-container');
const myUsernameDisplay = document.getElementById('my-username-display');
const mySocketIdDisplay = document.getElementById('my-socket-id-display');

const roomListEl = document.getElementById('room-list');
const createRoomBtn = document.getElementById('create-room-btn');
const roomUserListEl = document.getElementById('room-user-list');
const roomUserCountEl = document.getElementById('room-user-count');
const dmUserListEl = document.getElementById('dm-user-list');

const chatTitleEl = document.getElementById('chat-title');
const chatSubtitleEl = document.getElementById('chat-subtitle');
const chatTypeBadgeEl = document.getElementById('chat-type-badge');

const messagesContainer = document.getElementById('messages-container');
const messagesListEl = document.getElementById('messages-list');
const welcomeBanner = document.getElementById('welcome-banner');

const typingIndicatorBar = document.getElementById('typing-indicator-bar');
const typingTextEl = document.getElementById('typing-text');

const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

function initSocket() {
  socket = io();

  socket.on('connect', () => {
    currentUser.socketId = socket.id;
    if (mySocketIdDisplay) {
      mySocketIdDisplay.textContent = `ID: ${socket.id.substring(0, 8)}...`;
    }
  });

  socket.on('disconnect', () => {
    const statusText = document.querySelector('.status-text');
    const statusDot = document.querySelector('.status-dot');
    if (statusText) statusText.textContent = 'Disconnected';
    if (statusDot) statusDot.style.background = '#ef4444';
  });

  socket.on('user:login:success', (profile) => {
    currentUser.username = profile.username;
    currentUser.avatar = profile.avatar;
    currentUser.socketId = profile.socketId;

    myUsernameDisplay.textContent = profile.username;
    myAvatarContainer.innerHTML = getAvatarSVG(profile.avatar);
    if (mySocketIdDisplay) mySocketIdDisplay.textContent = `ID: ${profile.socketId.substring(0, 8)}...`;

    loginModal.classList.add('hidden');
    appContainer.classList.remove('hidden');

    joinRoom('general');
  });

  socket.on('room:history', (data) => {
    if (currentMode === 'room' && data.room === activeRoom) {
      messagesListEl.innerHTML = '';
      if (data.messages && data.messages.length > 0) {
        welcomeBanner.classList.add('hidden');
        data.messages.forEach((msg) => renderMessageBubble(msg));
      } else {
        welcomeBanner.classList.remove('hidden');
      }
      scrollToBottom();
    }
  });

  socket.on('room:userlist', (data) => {
    if (data.room === activeRoom) {
      renderRoomUserList(data.users || []);
    }
  });

  socket.on('users:online', (users) => {
    onlineUsersList = users || [];
    renderDmUserList();
    const currentRoomUsers = onlineUsersList.filter(u => u.currentRoom === activeRoom);
    if (currentMode === 'room') {
      renderRoomUserList(currentRoomUsers);
    }
  });

  socket.on('chat:receive', (msgObj) => {
    if (currentMode === 'room' && msgObj.room === activeRoom) {
      welcomeBanner.classList.add('hidden');
      renderMessageBubble(msgObj);
      scrollToBottom();
    }
  });

  socket.on('typing:update', (data) => {
    if (currentMode === 'room' && data.room === activeRoom) {
      if (data.isTyping) {
        typingTextEl.textContent = `${data.username} is typing...`;
        typingIndicatorBar.classList.add('visible');
      } else {
        typingIndicatorBar.classList.remove('visible');
      }
    }
  });

  socket.on('direct:receive', (dmPayload) => {
    const senderId = dmPayload.fromSocketId;
    if (!dmHistories[senderId]) {
      dmHistories[senderId] = [];
    }
    dmHistories[senderId].push(dmPayload);

    if (currentMode === 'dm' && activeDmRecipient && activeDmRecipient.socketId === senderId) {
      welcomeBanner.classList.add('hidden');
      renderMessageBubble(dmPayload, true);
      scrollToBottom();
    } else {
      renderDmUserList();
    }
  });

  socket.on('direct:sent', (dmPayload) => {
    const recipientId = dmPayload.recipientId;
    if (!dmHistories[recipientId]) {
      dmHistories[recipientId] = [];
    }
    dmHistories[recipientId].push(dmPayload);

    if (currentMode === 'dm' && activeDmRecipient && activeDmRecipient.socketId === recipientId) {
      welcomeBanner.classList.add('hidden');
      renderMessageBubble(dmPayload, true);
      scrollToBottom();
    }
  });
}

avatarPicker.addEventListener('click', (e) => {
  const option = e.target.closest('.avatar-option');
  if (option) {
    document.querySelectorAll('.avatar-option').forEach(opt => opt.classList.remove('selected'));
    option.classList.add('selected');
    currentUser.avatar = option.dataset.avatar;
  }
});

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;

  currentUser.username = username;
  if (!socket) initSocket();

  socket.emit('user:login', {
    username: currentUser.username,
    avatar: currentUser.avatar
  });
});

function joinRoom(roomName) {
  currentMode = 'room';
  activeRoom = roomName;
  activeDmRecipient = null;

  document.querySelectorAll('.room-item').forEach(item => {
    item.classList.toggle('active', item.dataset.room === roomName);
  });
  document.querySelectorAll('.dm-item').forEach(item => item.classList.remove('active'));

  chatTitleEl.innerHTML = `<span class="hash">#</span> ${roomName}`;
  chatSubtitleEl.textContent = `Room channel message history enabled`;
  chatTypeBadgeEl.textContent = 'Channel';
  chatTypeBadgeEl.style.background = 'rgba(99, 102, 241, 0.15)';
  chatTypeBadgeEl.style.color = '#6366f1';
  chatTypeBadgeEl.style.borderColor = 'rgba(99, 102, 241, 0.3)';

  messagesListEl.innerHTML = '';
  welcomeBanner.classList.remove('hidden');
  typingIndicatorBar.classList.remove('visible');

  socket.emit('room:join', { room: roomName });
}

roomListEl.addEventListener('click', (e) => {
  const roomItem = e.target.closest('.room-item');
  if (roomItem) {
    const roomName = roomItem.dataset.room;
    if (roomName !== activeRoom || currentMode !== 'room') {
      joinRoom(roomName);
    }
  }
});

createRoomBtn.addEventListener('click', () => {
  const newRoom = prompt('Enter new custom room channel name (e.g. tech, design, gaming):');
  if (newRoom && newRoom.trim()) {
    const cleanRoom = newRoom.trim().toLowerCase().replace(/[^a-z0-9_-]/g, '');
    if (!cleanRoom) return;

    let existing = document.querySelector(`.room-item[data-room="${cleanRoom}"]`);
    if (!existing) {
      const li = document.createElement('li');
      li.className = 'room-item';
      li.dataset.room = cleanRoom;
      li.innerHTML = `<span class="room-hash">#</span><span class="room-name">${cleanRoom}</span>`;
      roomListEl.appendChild(li);
    }
    joinRoom(cleanRoom);
  }
});

function renderRoomUserList(users) {
  roomUserListEl.innerHTML = '';
  roomUserCountEl.textContent = users.length;

  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'user-item';
    const isMe = u.socketId === currentUser.socketId;

    li.innerHTML = `
      <div class="user-info-brief">
        <div class="mini-avatar">${getAvatarSVG(u.avatar)}</div>
        <span style="font-size: 13.5px; font-weight: 500; color: ${isMe ? '#818cf8' : 'var(--text-main)'};">
          ${u.username} ${isMe ? '(You)' : ''}
        </span>
      </div>
      <span class="online-dot"></span>
    `;
    roomUserListEl.appendChild(li);
  });
}

function renderDmUserList() {
  dmUserListEl.innerHTML = '';
  const otherUsers = onlineUsersList.filter(u => u.socketId !== currentUser.socketId);

  if (otherUsers.length === 0) {
    dmUserListEl.innerHTML = `<li style="font-size: 12px; color: var(--text-muted); padding: 6px 10px;">No other users online. Open another tab!</li>`;
    return;
  }

  otherUsers.forEach(u => {
    const li = document.createElement('li');
    li.className = 'dm-item';
    if (currentMode === 'dm' && activeDmRecipient && activeDmRecipient.socketId === u.socketId) {
      li.classList.add('active');
    }

    const hasHistory = dmHistories[u.socketId] && dmHistories[u.socketId].length > 0;

    li.innerHTML = `
      <div class="user-info-brief">
        <div class="mini-avatar">${getAvatarSVG(u.avatar)}</div>
        <span style="font-size: 13.5px;">${u.username}</span>
      </div>
      ${hasHistory ? '<span class="dm-badge">DM</span>' : '<span class="online-dot"></span>'}
    `;

    li.addEventListener('click', () => {
      openDirectMessage(u);
    });

    dmUserListEl.appendChild(li);
  });
}

function openDirectMessage(recipientUser) {
  currentMode = 'dm';
  activeDmRecipient = recipientUser;

  document.querySelectorAll('.room-item').forEach(item => item.classList.remove('active'));
  renderDmUserList();

  chatTitleEl.innerHTML = `Direct Message: ${recipientUser.username}`;
  chatSubtitleEl.textContent = `Private end-to-end socket line (Recipient Socket ID: ${recipientUser.socketId.substring(0, 8)}...)`;
  chatTypeBadgeEl.textContent = 'Direct Message';
  chatTypeBadgeEl.style.background = 'rgba(6, 182, 212, 0.15)';
  chatTypeBadgeEl.style.color = '#06b6d4';
  chatTypeBadgeEl.style.borderColor = 'rgba(6, 182, 212, 0.3)';

  messagesListEl.innerHTML = '';
  typingIndicatorBar.classList.remove('visible');

  const history = dmHistories[recipientUser.socketId] || [];
  if (history.length > 0) {
    welcomeBanner.classList.add('hidden');
    history.forEach(dm => renderMessageBubble(dm, true));
  } else {
    welcomeBanner.classList.remove('hidden');
    welcomeBanner.querySelector('h3').textContent = `Start DM with ${recipientUser.username}`;
    welcomeBanner.querySelector('p').textContent = `Messages sent here are delivered directly to socket target.`;
  }
  scrollToBottom();
}

function renderMessageBubble(msgObj, isDm = false) {
  const isSelf = (msgObj.senderSocketId === currentUser.socketId) || (msgObj.fromSocketId === currentUser.socketId) || (msgObj.sender === currentUser.username) || (msgObj.from === currentUser.username);
  const senderName = msgObj.sender || msgObj.from || 'User';
  const avatarKey = msgObj.avatar || msgObj.fromAvatar || 'avatar1';
  const text = msgObj.message;
  const time = msgObj.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const card = document.createElement('div');
  card.className = `msg-card ${isSelf ? 'self' : ''} ${isDm ? 'direct-msg' : ''}`;

  card.innerHTML = `
    <div class="msg-avatar">${getAvatarSVG(avatarKey)}</div>
    <div class="msg-content-wrapper">
      <div class="msg-meta">
        <span class="msg-sender">${senderName} ${isDm ? '[DM]' : ''}</span>
        <span class="msg-time">${time}</span>
      </div>
        <div class="msg-bubble">${escapeHTML(text)}</div>
    </div>
  `;

  messagesListEl.appendChild(card);
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[tag] || tag)
  );
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

messageInput.addEventListener('input', () => {
  if (currentMode !== 'room') return;

  if (!isTypingState) {
    isTypingState = true;
    socket.emit('typing:start', { room: activeRoom });
  }

  if (typingTimeout) clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    stopTypingIndicator();
  }, TYPING_DEBOUNCE_MS);
});

function stopTypingIndicator() {
  if (isTypingState) {
    isTypingState = false;
    if (socket && currentMode === 'room') {
      socket.emit('typing:stop', { room: activeRoom });
    }
  }
  if (typingTimeout) clearTimeout(typingTimeout);
}

chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  stopTypingIndicator();

  if (currentMode === 'room') {
    socket.emit('chat:send', {
      room: activeRoom,
      message: text
    });
  } else if (currentMode === 'dm' && activeDmRecipient) {
    socket.emit('direct:send', {
      recipientId: activeDmRecipient.socketId,
      message: text
    });
  }

  messageInput.value = '';
});

window.addEventListener('DOMContentLoaded', () => {
});
