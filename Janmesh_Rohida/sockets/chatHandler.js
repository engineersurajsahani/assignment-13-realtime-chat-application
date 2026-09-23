const crypto = require('crypto');
const { getUser, addMessageToHistory } = require('../utils/messageStore');

/**
 * Formats current timestamp as HH:MM string.
 * @returns {string}
 */
function formatTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Handles group chat messaging, typing indicators, and private DMs.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
function handleChatEvents(io, socket) {
  // Event: "chat:send"
  socket.on('chat:send', ({ room, message }) => {
    if (!room || !message || !message.trim()) return;

    const user = getUser(socket.id);
    const sender = user ? user.username : 'Anonymous';

    const messageObj = {
      id: crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).substring(2),
      sender,
      message: message.trim(),
      timestamp: formatTimestamp()
    };

    // Store in-memory history
    addMessageToHistory(room, messageObj);

    // Broadcast message to room including sender
    io.to(room).emit('chat:receive', messageObj);
  });

  // Event: "typing:start"
  socket.on('typing:start', ({ room }) => {
    if (!room) return;
    const user = getUser(socket.id);
    if (!user) return;

    // Broadcast to room excluding sender
    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: true
    });
  });

  // Event: "typing:stop"
  socket.on('typing:stop', ({ room }) => {
    if (!room) return;
    const user = getUser(socket.id);
    if (!user) return;

    // Broadcast to room excluding sender
    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: false
    });
  });

  // Event: "direct:send"
  socket.on('direct:send', ({ recipientId, message }) => {
    if (!recipientId || !message || !message.trim()) return;

    const user = getUser(socket.id);
    const senderUsername = user ? user.username : 'Anonymous';

    const payload = {
      from: senderUsername,
      senderId: socket.id,
      message: message.trim(),
      timestamp: formatTimestamp()
    };

    // Deliver only to intended recipient socket
    io.to(recipientId).emit('direct:receive', payload);
  });
}

module.exports = handleChatEvents;
