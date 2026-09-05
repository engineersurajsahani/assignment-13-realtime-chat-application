// Client-Side Chat & Real-Time Engine
const socket = io();

// State
let currentUser = null;
let currentRoom = 'general';
let selectedAvatarSeed = 'Aarav';
let typingTimeout = null;
let isTyping = false;
let activeDmRecipient = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarOptions = document.querySelectorAll('.avatar-option');

const myAvatarEl = document.getElementById('my-avatar');
const myUsernameEl = document.getElementById('my-username');
const currentRoomTitleEl = document.getElementById('current-room-title');
const currentRoomDescEl = document.getElementById('current-room-desc');
const memberCountEl = document.getElementById('member-count');
const rosterCountEl = document.getElementById('roster-count');
const channelsListEl = document.getElementById('channels-list');
const customRoomForm = document.getElementById('custom-room-form');
const customRoomInput = document.getElementById('custom-room-input');

const messagesViewport = document.getElementById('messages-viewport');
const messagesContainer = document.getElementById('messages-container');
const typingBannerEl = document.getElementById('typing-banner');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');
const membersListEl = document.getElementById('members-list');

const dmModal = document.getElementById('dm-modal');
const dmRecipientNameEl = document.getElementById('dm-recipient-name');
const dmForm = document.getElementById('dm-form');
const dmInput = document.getElementById('dm-input');
const btnCloseDm = document.getElementById('btn-close-dm');

// Avatar selection
avatarOptions.forEach(opt => {
  opt.addEventListener('click', () => {
    avatarOptions.forEach(o => o.classList.remove('selected'));
    opt.classList.add('selected');
    selectedAvatarSeed = opt.getAttribute('data-seed');
  });
});

// URL Parameter Handling (?user=Aarav&room=developers)
function checkUrlParams() {
  const params = new URLSearchParams(window.location.search);
  const userParam = params.get('user');
  const roomParam = params.get('room');

  if (roomParam) {
    currentRoom = roomParam.toLowerCase();
  }

  if (userParam) {
    usernameInput.value = userParam;
    loginUser(userParam, `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(userParam)}`);
  }
}

// 1. User Login Handler
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const uname = usernameInput.value.trim();
  if (!uname) return;

  const avatarUrl = `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(selectedAvatarSeed || uname)}`;
  loginUser(uname, avatarUrl);
});

function loginUser(name, avatar) {
  socket.emit('user:login', {
    username: name,
    avatar
  });
}

socket.on('user:logged_in', ({ user }) => {
  currentUser = user;
  loginModal.classList.add('hidden');

  myUsernameEl.textContent = user.username;
  myAvatarEl.src = user.avatar;

  // Update URL state
  const newUrl = `${window.location.pathname}?user=${encodeURIComponent(user.username)}&room=${encodeURIComponent(currentRoom)}`;
  window.history.replaceState(null, '', newUrl);

  // Join initial channel
  switchRoom(currentRoom);
});

// 2. Room Switcher
function switchRoom(targetRoom) {
  currentRoom = targetRoom.toLowerCase();
  currentRoomTitleEl.textContent = currentRoom;
  messageInput.placeholder = `Message #${currentRoom}... (Press Enter to send)`;

  // Update room description
  const descs = {
    general: 'Public chat for all team members',
    developers: 'Code snippets, architecture, and dev banter',
    random: 'Off-topic memes, lunch plans, and fun'
  };
  currentRoomDescEl.textContent = descs[currentRoom] || `Discussions in #${currentRoom}`;

  // Highlight active sidebar item
  document.querySelectorAll('.channel-item').forEach(item => {
    if (item.getAttribute('data-room') === currentRoom) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  // Emit room join to server
  socket.emit('room:join', { room: currentRoom });
}

// Channels click listener
channelsListEl.addEventListener('click', (e) => {
  const item = e.target.closest('.channel-item');
  if (item) {
    const room = item.getAttribute('data-room');
    switchRoom(room);
  }
});

// Custom Channel Join Form
customRoomForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const customRoom = customRoomInput.value.trim().toLowerCase().replace(/\s+/g, '-');
  if (!customRoom) return;

  // Add to sidebar if not already there
  if (!document.querySelector(`[data-room="${customRoom}"]`)) {
    const li = document.createElement('li');
    li.className = 'channel-item';
    li.setAttribute('data-room', customRoom);
    li.innerHTML = `<span class="hash">#</span> ${customRoom}`;
    channelsListEl.appendChild(li);
  }

  switchRoom(customRoom);
  customRoomInput.value = '';
});

// 3. Message Rendering & History
socket.on('room:history', ({ messages }) => {
  messagesContainer.innerHTML = '';
  if (messages && Array.isArray(messages)) {
    messages.forEach(msg => appendMessage(msg));
  }
  scrollToBottom();
});

socket.on('chat:receive', (message) => {
  appendMessage(message);
  scrollToBottom();
});

function appendMessage(msg) {
  if (msg.isSystem) {
    const sysDiv = document.createElement('div');
    sysDiv.className = 'message-system';
    sysDiv.textContent = `ℹ️ ${msg.message} • ${msg.timestamp || ''}`;
    messagesContainer.appendChild(sysDiv);
    return;
  }

  const isMe = currentUser && (msg.sender === currentUser.username || msg.senderSocketId === socket.id);
  const card = document.createElement('div');
  card.className = `message-card ${isMe ? 'is-me' : ''}`;

  card.innerHTML = `
    <img src="${msg.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=User'}" class="message-avatar" alt="${msg.sender}">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author">${msg.sender}</span>
        <span class="message-time">${msg.timestamp}</span>
      </div>
      <div class="message-bubble">${escapeHtml(msg.message)}</div>
    </div>
  `;

  messagesContainer.appendChild(card);
}

function scrollToBottom() {
  messagesViewport.scrollTop = messagesViewport.scrollHeight;
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// 4. Message Sending
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat:send', {
    room: currentRoom,
    message: text
  });

  // Stop typing indicator
  socket.emit('typing:stop', { room: currentRoom });
  isTyping = false;

  messageInput.value = '';
  messageInput.focus();
});

// 5. Debounced Typing Indicator
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing:start', { room: currentRoom });
  }

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    isTyping = false;
    socket.emit('typing:stop', { room: currentRoom });
  }, 1000);
});

socket.on('typing:update', ({ username, isTyping, room }) => {
  if (room === currentRoom) {
    if (isTyping) {
      typingBannerEl.textContent = `✍️ ${username} is typing...`;
    } else {
      typingBannerEl.textContent = '';
    }
  }
});

// 6. Active Room Roster
socket.on('room:userlist', ({ users }) => {
  if (!users) return;
  memberCountEl.textContent = `${users.length} Online`;
  rosterCountEl.textContent = users.length;
  membersListEl.innerHTML = '';

  users.forEach(user => {
    const isMe = currentUser && user.username === currentUser.username;
    const item = document.createElement('div');
    item.className = 'member-item';
    item.innerHTML = `
      <div class="member-left">
        <img src="${user.avatar}" class="member-avatar" alt="${user.username}">
        <span class="member-name">${user.username} ${isMe ? '(You)' : ''}</span>
      </div>
      ${!isMe ? `<button class="btn-dm-trigger" data-socket="${user.socketId}" data-name="${user.username}">DM</button>` : ''}
    `;
    membersListEl.appendChild(item);
  });
});

// 7. Direct Messages (DM)
membersListEl.addEventListener('click', (e) => {
  const dmBtn = e.target.closest('.btn-dm-trigger');
  if (dmBtn) {
    activeDmRecipient = {
      socketId: dmBtn.getAttribute('data-socket'),
      username: dmBtn.getAttribute('data-name')
    };
    dmRecipientNameEl.textContent = `@${activeDmRecipient.username}`;
    dmModal.classList.remove('hidden');
    dmInput.focus();
  }
});

btnCloseDm.addEventListener('click', () => {
  dmModal.classList.add('hidden');
});

dmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !activeDmRecipient) return;

  socket.emit('direct:send', {
    recipientId: activeDmRecipient.socketId,
    message: text
  });

  dmInput.value = '';
  dmModal.classList.add('hidden');
});

// Handle incoming DM
socket.on('direct:receive', (dm) => {
  renderDmMessage(dm, false);
});

socket.on('direct:sent', (dm) => {
  renderDmMessage(dm, true);
});

function renderDmMessage(dm, isOutgoing) {
  const card = document.createElement('div');
  card.className = `message-card is-dm ${isOutgoing ? 'is-me' : ''}`;

  card.innerHTML = `
    <img src="${dm.avatar || 'https://api.dicebear.com/7.x/bottts/svg?seed=DM'}" class="message-avatar" alt="${dm.from}">
    <div class="message-content">
      <div class="message-header">
        <span class="message-author"><span class="dm-tag">🔒 DIRECT</span> ${isOutgoing ? `To @${dm.to}` : `From @${dm.from}`}</span>
        <span class="message-time">${dm.timestamp}</span>
      </div>
      <div class="message-bubble">${escapeHtml(dm.message)}</div>
    </div>
  `;

  messagesContainer.appendChild(card);
  scrollToBottom();
}

// Start
checkUrlParams();
