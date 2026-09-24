// sockets/chatHandler.js
const { connectedUsers } = require('./presenceStore');
const { addMessageToHistory } = require('../utils/messageStore');

/**
 * Format timestamp as HH:MM
 */
function getFormattedTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Registers chat, typing indicators, and direct messaging event listeners for a socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerChatHandlers(io, socket) {
  // Handle public room message sending
  socket.on('chat:send', (data) => {
    const { room, message } = data || {};
    const user = connectedUsers.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'You must be logged in to send a message.' });
      return;
    }

    if (!room || user.currentRoom !== room) {
      socket.emit('error', { message: 'You must be a member of the room to send messages in it.' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      socket.emit('error', { message: 'Message cannot be empty.' });
      return;
    }

    const randomSuffix = Math.random().toString(36).substring(2, 9);
    const messageObj = {
      id: `msg_${Date.now()}_${randomSuffix}`,
      sender: user.username,
      avatar: user.avatar,
      message: message.trim(),
      timestamp: getFormattedTimestamp()
    };

    // Store in-memory capped room history
    addMessageToHistory(room, messageObj);

    // Broadcast to entire room including sender for unified rendering pipeline
    io.to(room).emit('chat:receive', messageObj);
  });

  // Handle typing indicator start
  socket.on('typing:start', (data) => {
    const { room } = data || {};
    const user = connectedUsers.get(socket.id);

    if (!user || !room || user.currentRoom !== room) return;

    // Broadcast only to other members in the room
    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: true
    });
  });

  // Handle typing indicator stop
  socket.on('typing:stop', (data) => {
    const { room } = data || {};
    const user = connectedUsers.get(socket.id);

    if (!user || !room || user.currentRoom !== room) return;

    // Broadcast only to other members in the room
    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: false
    });
  });

  // Handle private direct messaging
  socket.on('direct:send', (data) => {
    const { recipientId, message } = data || {};
    const sender = connectedUsers.get(socket.id);

    if (!sender) {
      socket.emit('error', { message: 'You must be logged in to send direct messages.' });
      return;
    }

    if (!recipientId) {
      socket.emit('error', { message: 'Recipient ID is required.' });
      return;
    }

    if (!message || typeof message !== 'string' || !message.trim()) {
      socket.emit('error', { message: 'Direct message cannot be empty.' });
      return;
    }

    // Verify recipient socket connection and presence
    const recipientSocket = io.sockets.sockets.get(recipientId);
    const recipientUser = connectedUsers.get(recipientId);

    if (!recipientSocket || !recipientUser) {
      socket.emit('error', { message: 'Recipient is not connected or no longer available.' });
      return;
    }

    const timestamp = getFormattedTimestamp();
    const dmObj = {
      from: sender.username,
      fromId: socket.id,
      avatar: sender.avatar,
      message: message.trim(),
      timestamp
    };

    // Emit direct:receive to only that recipient socket
    io.to(recipientId).emit('direct:receive', dmObj);

    // Provide confirmation feedback event to the sender
    socket.emit('direct:sent', {
      toId: recipientId,
      toUsername: recipientUser.username,
      avatar: recipientUser.avatar,
      message: message.trim(),
      timestamp
    });
  });
}

module.exports = { registerChatHandlers };
