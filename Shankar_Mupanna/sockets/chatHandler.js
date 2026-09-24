const {
  getUser,
  addMessageToHistory
} = require('../utils/messageStore');

/**
 * Helper to generate HH:MM timestamp string.
 */
function getFormattedTimestamp() {
  const now = new Date();
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

/**
 * Registers chat messaging, typing indicators, and direct messaging event handlers.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
module.exports = function registerChatHandlers(io, socket) {
  // Event: chat:send
  socket.on('chat:send', (data) => {
    const { room, message } = data || {};
    if (!room || !message || !message.trim()) return;

    const sender = getUser(socket.id);
    const msgObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: sender ? sender.username : 'Anonymous',
      avatar: sender ? sender.avatar : 'avatar1.png',
      message: message.trim(),
      timestamp: getFormattedTimestamp(),
      room
    };

    // Store in message history buffer
    addMessageToHistory(room, msgObj);

    // Broadcast to all members in room including sender
    io.to(room).emit('chat:receive', msgObj);
  });

  // Event: typing:start
  socket.on('typing:start', (data) => {
    const { room } = data || {};
    if (!room) return;

    const user = getUser(socket.id);
    const username = user ? user.username : 'Anonymous';

    // Broadcast to all members in room except sender
    socket.to(room).emit('typing:update', {
      username,
      isTyping: true,
      room
    });
  });

  // Event: typing:stop
  socket.on('typing:stop', (data) => {
    const { room } = data || {};
    if (!room) return;

    const user = getUser(socket.id);
    const username = user ? user.username : 'Anonymous';

    // Broadcast to all members in room except sender
    socket.to(room).emit('typing:update', {
      username,
      isTyping: false,
      room
    });
  });

  // Event: direct:send
  socket.on('direct:send', (data) => {
    const { recipientId, message } = data || {};
    if (!recipientId || !message || !message.trim()) return;

    const sender = getUser(socket.id);
    const dmObj = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: sender ? sender.username : 'Anonymous',
      senderId: socket.id,
      recipientId,
      message: message.trim(),
      timestamp: getFormattedTimestamp(),
      avatar: sender ? sender.avatar : 'avatar1.png'
    };

    // Emit to intended recipient socket
    io.to(recipientId).emit('direct:receive', dmObj);

    // Emit confirmation to sender for local UI state
    socket.emit('direct:sent_confirm', dmObj);
  });
};
