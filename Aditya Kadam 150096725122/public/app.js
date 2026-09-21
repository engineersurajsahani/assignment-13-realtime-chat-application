const socket = io();

let currentUser = null;
let currentRoom = null;
let typingTimeout = null;

const loginScreen = document.getElementById('login-screen');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const chatArea = document.getElementById('chat-area');

const roomsList = document.getElementById('rooms-list');
const usersList = document.getElementById('users-list');
const messagesContainer = document.getElementById('messages-container');
const messageForm = document.getElementById('message-form');
const messageInput = document.getElementById('message-input');
const typingIndicator = document.getElementById('typing-indicator');
const roomTitle = document.getElementById('room-title');
const roomUserCount = document.getElementById('room-user-count');

const rooms = ['General', 'Tech Talk', 'Random', 'Gaming', 'Music'];

loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  
  if (!username) return;
  
  socket.emit('user:login', { username, avatar: null });
});

socket.on('user:loggedin', (data) => {
  currentUser = data;
  loginScreen.classList.add('hidden');
  initializeUI();
});

socket.on('error', (data) => {
  alert(data.message);
});

function initializeUI() {
  roomsList.innerHTML = rooms.map(room => `
    <button class="room-btn" data-room="${room}">
      <span>${room}</span>
      <span class="room-user-count" id="count-${room.replace(/\s/g, '-')}">0</span>
    </button>
  `).join('');
  
  roomsList.querySelectorAll('.room-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const room = btn.dataset.room;
      joinRoom(room);
    });
  });
  
  showEmptyState();
}

function joinRoom(room) {
  if (currentRoom) {
    socket.emit('room:leave', { room: currentRoom });
  }
  
  socket.emit('room:join', { room });
}

socket.on('room:history', (data) => {
  currentRoom = data.room;
  
  updateRoomUI();
  
  messagesContainer.innerHTML = '';
  data.messages.forEach(msg => displayMessage(msg));
  
  scrollToBottom();
  
  document.querySelectorAll('.room-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.room === currentRoom);
  });
});

socket.on('room:userlist', (data) => {
  updateRoomUserCount(data.room, data.users.length);
  
  if (data.room === currentRoom) {
    updateUsersList(data.users);
  }
});

socket.on('chat:receive', (message) => {
  if (message.type === 'system' || message.room === currentRoom || !message.room) {
    displayMessage(message);
    scrollToBottom();
  }
});

socket.on('typing:update', (data) => {
  if (data.isTyping) {
    typingIndicator.textContent = `${data.username} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});

socket.on('direct:receive', (data) => {
  displayDirectMessage(data);
});

socket.on('direct:sent', (data) => {
  displayDirectMessage(data);
});

function displayMessage(msg) {
  const messageEl = document.createElement('div');
  
  if (msg.type === 'system') {
    messageEl.className = 'message system';
    messageEl.innerHTML = `
      <div class="message-content">
        <div class="message-bubble">${msg.message}</div>
      </div>
    `;
  } else {
    const isSent = msg.sender === currentUser?.username;
    messageEl.className = `message ${isSent ? 'sent' : 'received'}`;
    messageEl.innerHTML = `
      <div class="message-avatar">
        <img src="${msg.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${msg.sender}`}" alt="${msg.sender}">
      </div>
      <div class="message-content">
        <span class="message-sender">${isSent ? 'You' : msg.sender}</span>
        <div class="message-bubble">${escapeHtml(msg.message)}</div>
        <span class="message-time">${formatTime(msg.timestamp)}</span>
      </div>
    `;
  }
  
  messagesContainer.appendChild(messageEl);
}

function displayDirectMessage(data) {
  const messageEl = document.createElement('div');
  const isSent = data.fromId === socket.id;
  messageEl.className = `message direct ${isSent ? 'sent' : 'received'}`;
  messageEl.innerHTML = `
    <div class="message-content">
      <span class="message-sender">${isSent ? `To ${data.from}` : `From ${data.from}`}</span>
      <div class="message-bubble">${escapeHtml(data.message)}</div>
      <span class="message-time">${formatTime(data.timestamp)}</span>
    </div>
  `;
  messagesContainer.appendChild(messageEl);
  scrollToBottom();
}

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  
  const message = messageInput.value.trim();
  if (!message || !currentRoom) return;
  
  socket.emit('chat:send', { room: currentRoom, message });
  messageInput.value = '';
  
  socket.emit('typing:stop', { room: currentRoom });
});

messageInput.addEventListener('input', () => {
  if (!currentRoom) return;
  
  socket.emit('typing:start', { room: currentRoom });
  
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 2000);
});

function updateRoomUserCount(room, count) {
  const countEl = document.getElementById(`count-${room.replace(/\s/g, '-')}`);
  if (countEl) {
    countEl.textContent = count;
  }
}

function updateRoomUI() {
  roomTitle.textContent = `#${currentRoom}`;
  roomUserCount.textContent = '';
}

function updateUsersList(users) {
  usersList.innerHTML = users
    .filter(user => user.id !== socket.id)
    .map(user => `
      <div class="user-item" data-user-id="${user.id}" data-username="${user.username}">
        <div class="user-item-avatar">
          <img src="${user.avatar}" alt="${user.username}">
        </div>
        <span class="user-item-name">${user.username}</span>
        <button class="user-item-dm">DM</button>
      </div>
    `).join('');
  
  usersList.querySelectorAll('.user-item').forEach(item => {
    item.querySelector('.user-item-dm').addEventListener('click', (e) => {
      e.stopPropagation();
      showDMModal(item.dataset.userId, item.dataset.username);
    });
  });
}

function showEmptyState() {
  messagesContainer.innerHTML = `
    <div class="empty-state">
      <h3>Welcome to Chat!</h3>
      <p>Select a room from the sidebar to start chatting</p>
    </div>
  `;
}

function scrollToBottom() {
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

function formatTime(timestamp) {
  const date = new Date(timestamp);
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

function showDMModal(userId, username) {
  const modal = document.createElement('div');
  modal.className = 'dm-modal';
  modal.innerHTML = `
    <div class="dm-modal-content">
      <h3>Send DM to ${username}</h3>
      <input type="text" class="dm-input" id="dm-message" placeholder="Type your message...">
      <div class="dm-buttons">
        <button class="dm-send-btn">Send</button>
        <button class="dm-cancel-btn">Cancel</button>
      </div>
    </div>
  `;
  
  document.body.appendChild(modal);
  
  modal.querySelector('.dm-send-btn').addEventListener('click', () => {
    const message = modal.querySelector('#dm-message').value.trim();
    if (message) {
      socket.emit('direct:send', { recipientId: userId, message });
    }
    modal.remove();
  });
  
  modal.querySelector('.dm-cancel-btn').addEventListener('click', () => {
    modal.remove();
  });
  
  modal.querySelector('#dm-message').addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
      const message = modal.querySelector('#dm-message').value.trim();
      if (message) {
        socket.emit('direct:send', { recipientId: userId, message });
      }
      modal.remove();
    }
  });
}
