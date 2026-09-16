const socket = io();
const rooms = ['general', 'developers', 'random'];
let currentRoom = 'general';
const username = 'User-' + Math.floor(Math.random() * 1000);

socket.emit('user:login', { username, avatar: 'avatar1.png' });

const roomListEl = document.getElementById('roomList');
const userListEl = document.getElementById('userList');
const messagesEl = document.getElementById('messages');
const headerEl = document.getElementById('header');
const typingEl = document.getElementById('typing');
const msgInput = document.getElementById('msgInput');
const sendBtn = document.getElementById('sendBtn');

function renderRooms() {
  roomListEl.innerHTML = rooms.map(r =>
    `<div class="room-item ${r === currentRoom ? 'active' : ''}" data-room="${r}">#${r}</div>`
  ).join('');
  roomListEl.querySelectorAll('.room-item').forEach(el => {
    el.addEventListener('click', () => joinRoom(el.dataset.room));
  });
}

function joinRoom(room) {
  if (room === currentRoom) return;
  currentRoom = room;
  headerEl.textContent = `#${room}`;
  messagesEl.innerHTML = '';
  renderRooms();
  socket.emit('room:join', { room });
}

function renderMessage({ sender, message, timestamp }) {
  const own = sender === username;
  const div = document.createElement('div');
  div.className = `msg ${own ? 'own' : ''}`;
  div.innerHTML = `<div class="sender">${sender} · ${timestamp}</div><div class="bubble">${message}</div>`;
  messagesEl.appendChild(div);
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

renderRooms();
headerEl.textContent = `#${currentRoom}`;

socket.on('connect', () => {
  socket.emit('room:join', { room: currentRoom });
});

socket.on('room:history', ({ room, messages }) => {
  if (room !== currentRoom) return;
  messagesEl.innerHTML = '';
  messages.forEach(renderMessage);
});

socket.on('chat:receive', (msg) => {
  renderMessage(msg);
});

socket.on('room:userlist', ({ room, users }) => {
  if (room !== currentRoom) return;
  userListEl.innerHTML = users.map(u => `<div class="user-item">${u}</div>`).join('');
});

let typingTimeout;
socket.on('typing:update', ({ username: who, isTyping }) => {
  typingEl.textContent = isTyping ? `${who} is typing...` : '';
});

sendBtn.addEventListener('click', sendMessage);
msgInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') sendMessage();
  socket.emit('typing:start', { room: currentRoom });
  clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => socket.emit('typing:stop', { room: currentRoom }), 1000);
});

function sendMessage() {
  const message = msgInput.value.trim();
  if (!message) return;
  socket.emit('chat:send', { room: currentRoom, message });
  socket.emit('typing:stop', { room: currentRoom });
  msgInput.value = '';
}