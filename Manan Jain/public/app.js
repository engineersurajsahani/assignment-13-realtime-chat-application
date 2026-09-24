// public/app.js
const socket = io();

// State
let currentUser = null;
let currentRoom = 'general';
let typingTimeout = null;

// DOM Elements
const loginModal = document.getElementById('login-modal');
const usernameInput = document.getElementById('login-username');
const loginBtn = document.getElementById('login-btn');
const activeChannelTitle = document.getElementById('active-channel-name');
const messagesContainer = document.getElementById('messages-container');
const messageInput = document.getElementById('message-input');
const sendBtn = document.getElementById('send-btn');
const usersRoster = document.getElementById('users-roster');
const typingAlert = document.getElementById('typing-alert');

// Avatars pool
const avatars = ['🦊', '🐼', '🦁', '🚀', '⚡', '🤖', '👾', '🔥'];

// User Login Action
loginBtn.addEventListener('click', () => {
  const username = usernameInput.value.trim();
  if (!username) return;

  const randomAvatar = avatars[Math.floor(Math.random() * avatars.length)];
  socket.emit('user:login', { username, avatar: randomAvatar });
});

usernameInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') loginBtn.click();
});

socket.on('user:authenticated', (user) => {
  currentUser = user;
  loginModal.style.display = 'none';
  document.getElementById('my-profile-name').textContent = user.username;
  document.getElementById('my-profile-avatar').textContent = user.avatar;

  // Join initial channel
  switchChannel('general');
});

// Switching Channel
function switchChannel(channelName) {
  currentRoom = channelName;
  activeChannelTitle.textContent = `#${channelName}`;

  document.querySelectorAll('.channel-item').forEach(item => {
    if (item.getAttribute('data-room') === channelName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  messagesContainer.innerHTML = '';
  socket.emit('room:join', { room: channelName });
}

document.querySelectorAll('.channel-item').forEach(item => {
  item.addEventListener('click', () => {
    const room = item.getAttribute('data-room');
    if (room && room !== currentRoom) {
      switchChannel(room);
    }
  });
});

// Message History hydration
socket.on('room:history', (data) => {
  if (data.room !== currentRoom) return;
  messagesContainer.innerHTML = '';
  data.messages.forEach(msg => appendMessage(msg));
  scrollToBottom();
});

// Receiving live group messages
socket.on('chat:receive', (msg) => {
  if (msg.room === currentRoom) {
    appendMessage(msg);
    scrollToBottom();
  }
});

// Receiving direct messages
socket.on('direct:receive', (dm) => {
  alert(`📩 Direct Message from ${dm.from}: "${dm.message}"`);
  appendDMNotification(dm);
});

socket.on('direct:sent', (dm) => {
  alert(`✅ Direct message delivered to ${dm.to}!`);
});

// Active online users in room
socket.on('room:userlist', (data) => {
  if (data.room !== currentRoom) return;
  usersRoster.innerHTML = '';
  data.users.forEach(u => {
    const item = document.createElement('div');
    item.className = 'user-item';
    item.innerHTML = `
      <div class="online-dot"></div>
      <span>${u.avatar}</span>
      <span>${u.username}</span>
    `;

    // Click to direct message
    if (u.socketId !== socket.id) {
      item.title = 'Click to send direct message';
      item.addEventListener('click', () => {
        const text = prompt(`Send Direct Message to ${u.username}:`);
        if (text && text.trim()) {
          socket.emit('direct:send', { recipientId: u.socketId, message: text });
        }
      });
    }

    usersRoster.appendChild(item);
  });
});

// Live Typing Indicators
socket.on('typing:update', (data) => {
  if (data.room === currentRoom && data.isTyping) {
    typingAlert.textContent = `${data.username} is typing...`;
  } else {
    typingAlert.textContent = '';
  }
});

// Typing event emitter
messageInput.addEventListener('input', () => {
  socket.emit('typing:start', { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 1200);
});

// Sending Message
function sendMessage() {
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat:send', { room: currentRoom, message: text });
  socket.emit('typing:stop', { room: currentRoom });
  messageInput.value = '';
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Helpers
function appendMessage(msg) {
  const isSelf = currentUser && msg.senderId === socket.id;
  const row = document.createElement('div');
  row.className = `msg-row ${isSelf ? 'self' : ''}`;

  row.innerHTML = `
    <div class="msg-avatar">${msg.avatar || '👤'}</div>
    <div class="msg-content">
      <div class="msg-meta">
        <strong>${isSelf ? 'You' : msg.sender}</strong>
        <span>${msg.timestamp}</span>
      </div>
      <div class="msg-bubble">${escapeHtml(msg.message)}</div>
    </div>
  `;

  messagesContainer.appendChild(row);
}

function appendDMNotification(dm) {
  const note = document.createElement('div');
  note.style.padding = '8px 12px';
  note.style.margin = '4px 0';
  note.style.borderRadius = '8px';
  note.style.background = 'rgba(139, 92, 246, 0.2)';
  note.style.border = '1px solid #8b5cf6';
  note.style.fontSize = '0.85rem';
  note.innerHTML = `🔒 <strong>DM from ${dm.from}</strong> (${dm.timestamp}): ${escapeHtml(dm.message)}`;
  messagesContainer.appendChild(note);
  scrollToBottom();
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function escapeHtml(str) {
  return str.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
