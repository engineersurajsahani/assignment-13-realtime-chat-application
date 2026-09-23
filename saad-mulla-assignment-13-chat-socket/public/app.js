const socket = io();

let currentUsername = '';
let currentRoom = 'general';
let typingTimeout = null;
let activeDmRecipientId = null;

// DOM Elements
const loginOverlay = document.getElementById('login-overlay');
const usernameInput = document.getElementById('username-input');
const loginBtn = document.getElementById('login-btn');

const myName = document.getElementById('my-name');
const roomItems = document.querySelectorAll('.room-item');
const currentRoomTitle = document.getElementById('current-room-title');
const userListEl = document.getElementById('user-list');
const userCountEl = document.getElementById('user-count');

const messagesContainer = document.getElementById('messages-container');
const chatInput = document.getElementById('chat-input');
const sendBtn = document.getElementById('send-btn');
const typingIndicator = document.getElementById('typing-indicator');

const dmModal = document.getElementById('dm-modal');
const dmTargetName = document.getElementById('dm-target-name');
const dmMessages = document.getElementById('dm-messages');
const dmInput = document.getElementById('dm-input');
const dmSendBtn = document.getElementById('dm-send-btn');
const closeDmBtn = document.getElementById('close-dm-btn');

// Login Event
loginBtn.addEventListener('click', handleLogin);
usernameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') handleLogin();
});

function handleLogin() {
  const username = usernameInput.value.trim();
  if (!username) return;

  currentUsername = username;
  socket.emit('user:login', { username });
}

socket.on('user:login:success', (data) => {
  loginOverlay.classList.add('hidden');
  myName.textContent = data.username;
  chatInput.disabled = false;
  sendBtn.disabled = false;

  // Join initial room
  joinRoom(currentRoom);
});

// Room Switching
roomItems.forEach(item => {
  item.addEventListener('click', () => {
    const selectedRoom = item.getAttribute('data-room');
    if (selectedRoom === currentRoom) return;

    roomItems.forEach(r => r.classList.remove('active'));
    item.classList.add('active');

    currentRoom = selectedRoom;
    currentRoomTitle.textContent = '# ' + currentRoom;
    chatInput.placeholder = 'Message #' + currentRoom + '...';

    joinRoom(currentRoom);
  });
});

function joinRoom(room) {
  messagesContainer.innerHTML = '';
  socket.emit('room:join', { room });
}

// Room History Hydration
socket.on('room:history', (data) => {
  messagesContainer.innerHTML = '';
  if (data.messages && Array.isArray(data.messages)) {
    data.messages.forEach(msg => appendMessage(msg));
  }
});

// Room Userlist Update
socket.on('room:userlist', (data) => {
  if (data.room !== currentRoom) return;
  userListEl.innerHTML = '';
  userCountEl.textContent = data.users.length;

  data.users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'user-item';
    
    const isMe = u.socketId === socket.id;
    li.innerHTML = `
      <span>${u.username} ${isMe ? '(You)' : ''}</span>
      ${!isMe ? `<button class="dm-btn" onclick="openDm('${u.socketId}', '${u.username}')">DM</button>` : ''}
    `;
    userListEl.appendChild(li);
  });
});

// Group Messaging
sendBtn.addEventListener('click', sendMessage);
chatInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
  else handleTyping();
});

function sendMessage() {
  const msg = chatInput.value.trim();
  if (!msg) return;

  socket.emit('chat:send', { room: currentRoom, message: msg });
  chatInput.value = '';

  // Stop typing indicator
  socket.emit('typing:stop', { room: currentRoom });
  clearTimeout(typingTimeout);
}

socket.on('chat:receive', (msgObj) => {
  appendMessage(msgObj);
});

function appendMessage(msgObj) {
  const isMine = msgObj.sender === currentUsername;
  const div = document.createElement('div');
  div.className = 'message-card ' + (isMine ? 'mine' : '');
  div.innerHTML = `
    <div class="message-header">
      <span>${msgObj.sender}</span>
      <span>${msgObj.timestamp}</span>
    </div>
    <div class="message-body">${escapeHtml(msgObj.message)}</div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Debounced Typing Indicators
function handleTyping() {
  socket.emit('typing:start', { room: currentRoom });

  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 1500);
}

socket.on('typing:update', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = data.username + ' is typing...';
  } else {
    typingIndicator.textContent = '';
  }
});

// Direct Messaging (DM)
window.openDm = function(socketId, username) {
  activeDmRecipientId = socketId;
  dmTargetName.textContent = 'DM with ' + username;
  dmMessages.innerHTML = '';
  dmModal.classList.remove('hidden');
};

closeDmBtn.addEventListener('click', () => {
  dmModal.classList.add('hidden');
  activeDmRecipientId = null;
});

dmSendBtn.addEventListener('click', sendDm);
dmInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendDm();
});

function sendDm() {
  const msg = dmInput.value.trim();
  if (!msg || !activeDmRecipientId) return;

  socket.emit('direct:send', { recipientId: activeDmRecipientId, message: msg });
  dmInput.value = '';
}

socket.on('direct:sent', (data) => {
  appendDmMessage('You', data.message, data.timestamp, true);
});

socket.on('direct:receive', (data) => {
  if (dmModal.classList.contains('hidden')) {
    openDm(data.fromId, data.from);
  }
  appendDmMessage(data.from, data.message, data.timestamp, false);
});

function appendDmMessage(sender, message, timestamp, isMine) {
  const div = document.createElement('div');
  div.style.alignSelf = isMine ? 'flex-end' : 'flex-start';
  div.style.backgroundColor = isMine ? '#0284c7' : '#1e293b';
  div.style.padding = '0.5rem 0.8rem';
  div.style.borderRadius = '8px';
  div.style.maxWidth = '80%';
  div.style.fontSize = '0.85rem';
  div.innerHTML = `<strong>${sender}</strong> [${timestamp}]: ${escapeHtml(message)}`;
  dmMessages.appendChild(div);
  dmMessages.scrollTop = dmMessages.scrollHeight;
}

function escapeHtml(text) {
  return text.replace(/&/g, "&amp;")
             .replace(/</g, "&lt;")
             .replace(/>/g, "&gt;")
             .replace(/"/g, "&quot;")
             .replace(/'/g, "&#039;");
}