const socket = io();

let currentRoom = 'general';
let typingTimeout = null;

const usernameInput = document.getElementById('usernameInput');
const loginBtn = document.getElementById('loginBtn');
const roomItems = document.querySelectorAll('.room-item');
const currentRoomTitle = document.getElementById('currentRoomTitle');
const userList = document.getElementById('userList');
const userCount = document.getElementById('userCount');
const messagesContainer = document.getElementById('messagesContainer');
const typingIndicator = document.getElementById('typingIndicator');
const messageForm = document.getElementById('messageForm');
const messageInput = document.getElementById('messageInput');

const loginUser = () => {
  const username = usernameInput.value.trim() || 'User';
  socket.emit('user:login', { username });
};

loginBtn.addEventListener('click', loginUser);

const switchRoom = (roomName) => {
  currentRoom = roomName;
  currentRoomTitle.textContent = `# ${roomName}`;

  roomItems.forEach((item) => {
    if (item.getAttribute('data-room') === roomName) {
      item.classList.add('active');
    } else {
      item.classList.remove('active');
    }
  });

  messagesContainer.innerHTML = '';
  typingIndicator.textContent = '';
  socket.emit('room:join', { room: roomName });
};

roomItems.forEach((item) => {
  item.addEventListener('click', () => {
    const room = item.getAttribute('data-room');
    if (room !== currentRoom) {
      switchRoom(room);
    }
  });
});

const appendMessage = (msg) => {
  const div = document.createElement('div');
  div.className = 'message-item';
  div.innerHTML = `<span class="sender">${msg.sender}:</span><span class="text">${msg.message}</span><span class="time">${msg.timestamp}</span>`;
  messagesContainer.appendChild(div);
  messagesContainer.scrollTop = messagesContainer.scrollHeight;
};

messageForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  socket.emit('chat:send', {
    room: currentRoom,
    message: text
  });

  socket.emit('typing:stop', { room: currentRoom });
  messageInput.value = '';
});

messageInput.addEventListener('input', () => {
  socket.emit('typing:start', { room: currentRoom });

  if (typingTimeout) clearTimeout(typingTimeout);
  typingTimeout = setTimeout(() => {
    socket.emit('typing:stop', { room: currentRoom });
  }, 1500);
});

socket.on('connect', () => {
  loginUser();
  switchRoom(currentRoom);
});

socket.on('room:history', ({ room, messages }) => {
  if (room === currentRoom && Array.isArray(messages)) {
    messagesContainer.innerHTML = '';
    messages.forEach((m) => appendMessage(m));
  }
});

socket.on('chat:receive', (msg) => {
  appendMessage(msg);
});

socket.on('room:userlist', ({ room, users }) => {
  if (room === currentRoom && Array.isArray(users)) {
    userList.innerHTML = '';
    users.forEach((u) => {
      const li = document.createElement('li');
      li.textContent = `• ${u}`;
      userList.appendChild(li);
    });
    userCount.textContent = users.length;
  }
});

socket.on('typing:update', ({ username, isTyping }) => {
  if (isTyping) {
    typingIndicator.textContent = `${username} is typing...`;
  } else {
    typingIndicator.textContent = '';
  }
});

socket.on('direct:receive', ({ from, message, timestamp }) => {
  appendMessage({
    sender: `[DM from ${from}]`,
    message,
    timestamp
  });
});
