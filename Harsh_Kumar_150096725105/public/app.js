const socket = io();

// UI Elements
const loginPage = document.getElementById('loginPage');
const chatPage = document.getElementById('chatPage');
const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const roomElements = document.querySelectorAll('.room');
const roomTitle = document.getElementById('roomTitle');
const currentRoomDisplay = document.getElementById('currentRoomDisplay');
const messagesContainer = document.getElementById('messagesContainer');
const messageInput = document.getElementById('messageInput');
const sendBtn = document.getElementById('sendBtn');
const userList = document.getElementById('userList');
const typingIndicator = document.getElementById('typingIndicator');

let currentRoom = 'general';
let username = '';
let typingTimeout = null;

// Login
loginBtn.addEventListener('click', () => {
  if (usernameInput.value.trim()) {
    username = usernameInput.value.trim();
    socket.emit('user:login', { username, avatar: 'default.png' });
    loginPage.classList.remove('active');
    chatPage.classList.add('active');
    joinRoom('general');
  }
});

function joinRoom(room) {
  currentRoom = room;
  roomTitle.innerText = `#${room}`;
  currentRoomDisplay.innerText = `#${room}`;
  messagesContainer.innerHTML = ''; // Clear current messages
  
  // Update active class on sidebar
  roomElements.forEach(el => {
    el.classList.remove('active');
    if (el.dataset.room === room) el.classList.add('active');
  });

  socket.emit('room:join', { room });
}

roomElements.forEach(el => {
  el.addEventListener('click', () => {
    if (currentRoom !== el.dataset.room) {
      joinRoom(el.dataset.room);
    }
  });
});

// Messaging
function sendMessage() {
  const text = messageInput.value.trim();
  if (text) {
    socket.emit('chat:send', { room: currentRoom, message: text });
    messageInput.value = '';
    socket.emit('typing:stop', { room: currentRoom });
  }
}

sendBtn.addEventListener('click', sendMessage);
messageInput.addEventListener('keypress', (e) => {
  if (e.key === 'Enter') sendMessage();
});

// Typing Indicator
messageInput.addEventListener('input', () => {
  socket.emit('typing:start', { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 1000);
});

function appendMessage(msgObj, isDM = false) {
  const div = document.createElement('div');
  div.classList.add('message');
  if (msgObj.sender === username || msgObj.from === username) div.classList.add('self');
  if (isDM) div.classList.add('dm');
  
  div.innerHTML = `
    <div class="meta"><strong>${isDM ? 'From ' + msgObj.from : msgObj.sender}</strong> <span class="time">${msgObj.timestamp}</span></div>
    <div class="text">${msgObj.message}</div>
  `;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
}

// Socket Event Listeners
socket.on('room:history', ({ room, messages }) => {
  if (room === currentRoom) {
    messages.forEach(msg => appendMessage(msg));
  }
});

socket.on('chat:receive', (msgObj) => {
  appendMessage(msgObj);
});

socket.on('direct:receive', (msgObj) => {
  appendMessage(msgObj, true);
});

socket.on('room:userlist', ({ room, users }) => {
  if (room === currentRoom) {
    userList.innerHTML = users.map(u => `<li>${u}</li>`).join('');
  }
});

socket.on('typing:update', ({ username: typer, isTyping }) => {
  if (isTyping) {
    typingIndicator.innerText = `${typer} is typing...`;
  } else {
    typingIndicator.innerText = '';
  }
});
