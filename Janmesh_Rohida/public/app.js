/**
 * Client-Side Socket Event Handling & UI Logic
 */

// Initialize Socket.io connection to same origin
const socket = io();

// State Variables
let currentUser = {
  username: '',
  avatar: '☕'
};
let currentRoom = 'general';
let isTyping = false;
let typingTimeout = null;
let activeDMRecipient = null; // { socketId, username, avatar }

// DOM Elements
const loginModal = document.getElementById('login-modal');
const loginForm = document.getElementById('login-form');
const usernameInput = document.getElementById('username-input');
const avatarPicker = document.getElementById('avatar-picker');
const appContainer = document.getElementById('app-container');

const currentUserAvatar = document.getElementById('current-user-avatar');
const currentUserName = document.getElementById('current-user-name');

const roomList = document.getElementById('room-list');
const activeChannelTitle = document.getElementById('active-channel-title');
const activeChannelTopic = document.getElementById('active-channel-topic');
const userRoster = document.getElementById('user-roster');
const rosterCount = document.getElementById('roster-count');

const messagesContainer = document.getElementById('messages-container');
const chatForm = document.getElementById('chat-form');
const messageInput = document.getElementById('message-input');

const typingIndicatorBar = document.getElementById('typing-indicator-bar');
const typingDotsContainer = document.getElementById('typing-dots-container');
const typingText = document.getElementById('typing-text');

// DM Modal Elements
const dmModal = document.getElementById('dm-modal');
const dmCloseBtn = document.getElementById('dm-close-btn');
const dmRecipientAvatar = document.getElementById('dm-recipient-avatar');
const dmRecipientName = document.getElementById('dm-recipient-name');
const dmRecipientSocket = document.getElementById('dm-recipient-socket');
const dmMessagesContainer = document.getElementById('dm-messages-container');
const dmForm = document.getElementById('dm-form');
const dmInput = document.getElementById('dm-input');

// Channel Topic Mapping
const ROOM_TOPICS = {
  general: 'General discussion & community updates',
  developers: 'Code reviews, debugging & tech talk',
  random: 'Casual chats, memes & off-topic conversations'
};

/* ==========================================================================
   1. LOGIN & INITIALIZATION
   ========================================================================== */

// Handle Avatar Selection
avatarPicker.addEventListener('click', (e) => {
  const target = e.target.closest('.avatar-option');
  if (!target) return;

  document.querySelectorAll('.avatar-option').forEach(btn => btn.classList.remove('selected'));
  target.classList.add('selected');
  currentUser.avatar = target.dataset.avatar;
});

// Handle Login Submission
loginForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const username = usernameInput.value.trim();
  if (!username) return;

  currentUser.username = username;

  // Update Profile Header
  currentUserAvatar.textContent = currentUser.avatar;
  currentUserName.textContent = currentUser.username;

  // Emit Login Event
  socket.emit('user:login', {
    username: currentUser.username,
    avatar: currentUser.avatar
  });

  // Join default room (#general)
  socket.emit('room:join', { room: currentRoom });

  // UI transition
  loginModal.classList.add('hidden');
  appContainer.classList.remove('hidden');
  messageInput.focus();
});

/* ==========================================================================
   2. ROOM SWITCHING
   ========================================================================== */

roomList.addEventListener('click', (e) => {
  const roomItem = e.target.closest('.room-item');
  if (!roomItem) return;

  const selectedRoom = roomItem.dataset.room;
  if (selectedRoom === currentRoom) return;

  // Leave previous room
  socket.emit('room:leave', { room: currentRoom });

  // Update active state in UI
  document.querySelectorAll('.room-item').forEach(el => el.classList.remove('active'));
  roomItem.classList.add('active');

  // Switch state & join new room
  currentRoom = selectedRoom;
  socket.emit('room:join', { room: currentRoom });

  // Reset chat view
  messagesContainer.innerHTML = '';
  activeChannelTitle.textContent = `#${currentRoom}`;
  activeChannelTopic.textContent = ROOM_TOPICS[currentRoom] || 'Discussion channel';
  messageInput.placeholder = `Type a message in #${currentRoom}...`;
  
  // Clear typing state
  stopTyping();
});

/* ==========================================================================
   3. MESSAGING & TYPING INDICATOR DEBOUNCE
   ========================================================================== */

// Emit chat message
chatForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = messageInput.value.trim();
  if (!text) return;

  // Stop typing indicator immediately
  stopTyping();

  // Send chat event
  socket.emit('chat:send', {
    room: currentRoom,
    message: text
  });

  messageInput.value = '';
});

// Typing indicator listener with 2-second debounce
messageInput.addEventListener('input', () => {
  if (!isTyping) {
    isTyping = true;
    socket.emit('typing:start', { room: currentRoom });
  }

  // Reset debounce timer
  if (typingTimeout) clearTimeout(typingTimeout);

  typingTimeout = setTimeout(() => {
    stopTyping();
  }, 2000); // Auto-emit typing:stop after 2 seconds of inactivity
});

function stopTyping() {
  if (isTyping) {
    isTyping = false;
    socket.emit('typing:stop', { room: currentRoom });
  }
  if (typingTimeout) {
    clearTimeout(typingTimeout);
    typingTimeout = null;
  }
}

/* ==========================================================================
   4. SOCKET EVENT LISTENERS
   ========================================================================== */

// Hydrate room history upon joining
socket.on('room:history', ({ room, messages }) => {
  if (room !== currentRoom) return;

  messagesContainer.innerHTML = '';
  if (messages && messages.length > 0) {
    messages.forEach(msg => appendMessage(msg));
  } else {
    renderSystemNotice(`Welcome to #${room}! Be the first to send a message.`);
  }
  scrollToBottom(messagesContainer);
});

// Receive live group chat message
socket.on('chat:receive', (msgObj) => {
  appendMessage(msgObj);
  scrollToBottom(messagesContainer);
});

// Update online user roster
socket.on('room:userlist', ({ room, users }) => {
  if (room !== currentRoom) return;

  rosterCount.textContent = users ? users.length : 0;
  userRoster.innerHTML = '';

  if (!users || users.length === 0) return;

  users.forEach(u => {
    const li = document.createElement('li');
    li.className = 'roster-item';

    const isSelf = u.socketId === socket.id;

    li.innerHTML = `
      <div class="roster-user-left">
        <span class="roster-avatar">${u.avatar || '👤'}</span>
        <span class="roster-name">${escapeHTML(u.username)}</span>
        ${isSelf ? '<span class="roster-self-tag">(you)</span>' : ''}
      </div>
      ${!isSelf ? `<button class="dm-btn-icon" data-socketid="${u.socketId}" data-username="${escapeHTML(u.username)}" data-avatar="${u.avatar || '👤'}">DM</button>` : ''}
    `;

    // Click handler for opening DM modal
    if (!isSelf) {
      li.addEventListener('click', (e) => {
        openDMModal({
          socketId: u.socketId,
          username: u.username,
          avatar: u.avatar || '👤'
        });
      });
    }

    userRoster.appendChild(li);
  });
});

// Receive typing updates from room members
socket.on('typing:update', ({ username, isTyping: typingState }) => {
  if (typingState) {
    typingDotsContainer.innerHTML = `
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
      <span class="typing-dot"></span>
    `;
    typingText.textContent = `${username} is typing...`;
  } else {
    typingDotsContainer.innerHTML = '';
    typingText.textContent = '';
  }
});

// Receive private direct message
socket.on('direct:receive', ({ from, senderId, message, timestamp }) => {
  // If DM modal is currently open with this sender
  if (activeDMRecipient && activeDMRecipient.socketId === senderId) {
    appendDMMessage({ from, message, timestamp, isSelf: false });
  } else {
    // Open DM modal or switch active recipient
    openDMModal({
      socketId: senderId,
      username: from,
      avatar: '👤'
    });
    appendDMMessage({ from, message, timestamp, isSelf: false });
  }
  scrollToBottom(dmMessagesContainer);
});

/* ==========================================================================
   5. UI HELPER FUNCTIONS & DIRECT MESSAGING
   ========================================================================== */

function appendMessage({ sender, message, timestamp }) {
  const isSelf = sender === currentUser.username;
  const messageGroup = document.createElement('div');
  messageGroup.className = `message-group ${isSelf ? 'self' : 'other'}`;

  messageGroup.innerHTML = `
    <div class="message-meta">
      <span class="message-sender">${escapeHTML(sender)}</span>
      <span class="message-timestamp">${timestamp}</span>
    </div>
    <div class="message-bubble">${escapeHTML(message)}</div>
  `;

  messagesContainer.appendChild(messageGroup);
}

function renderSystemNotice(text) {
  const notice = document.createElement('div');
  notice.style.textAlign = 'center';
  notice.style.margin = '16px 0';
  notice.style.fontSize = '13px';
  notice.style.color = 'var(--color-text-muted)';
  notice.style.fontStyle = 'italic';
  notice.textContent = text;
  messagesContainer.appendChild(notice);
}

// DM Modal Handling
function openDMModal(recipient) {
  activeDMRecipient = recipient;
  dmRecipientAvatar.textContent = recipient.avatar;
  dmRecipientName.textContent = recipient.username;
  dmRecipientSocket.textContent = `Socket ID: ${recipient.socketId}`;
  dmModal.classList.remove('hidden');
  dmInput.focus();
}

dmCloseBtn.addEventListener('click', () => {
  dmModal.classList.add('hidden');
  activeDMRecipient = null;
});

// Send Direct Message
dmForm.addEventListener('submit', (e) => {
  e.preventDefault();
  const text = dmInput.value.trim();
  if (!text || !activeDMRecipient) return;

  const now = new Date();
  const timestamp = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`;

  // Emit direct:send event to server
  socket.emit('direct:send', {
    recipientId: activeDMRecipient.socketId,
    message: text
  });

  // Render own sent message in DM window locally
  appendDMMessage({
    from: currentUser.username,
    message: text,
    timestamp,
    isSelf: true
  });

  dmInput.value = '';
  scrollToBottom(dmMessagesContainer);
});

function appendDMMessage({ from, message, timestamp, isSelf }) {
  const div = document.createElement('div');
  div.className = `message-group ${isSelf ? 'self' : 'other'}`;

  div.innerHTML = `
    <div class="message-meta">
      <span class="message-sender">${escapeHTML(from)}</span>
      <span class="message-timestamp">${timestamp}</span>
    </div>
    <div class="message-bubble">${escapeHTML(message)}</div>
  `;

  dmMessagesContainer.appendChild(div);
}

function scrollToBottom(container) {
  container.scrollTop = container.scrollHeight;
}

function escapeHTML(str) {
  return str.replace(/[&<>'"]/g, 
    tag => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      "'": '&#39;',
      '"': '&quot;'
    }[tag] || tag)
  );
}
