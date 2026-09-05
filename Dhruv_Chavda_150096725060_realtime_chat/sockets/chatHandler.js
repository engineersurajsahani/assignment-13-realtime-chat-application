const { addMessageToHistory } = require('../utils/messageStore');
const { connectedUsers } = require('./userHandler');

module.exports = function registerChatHandlers(io, socket) {
  // 1. Send Room Message
  socket.on('chat:send', ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !message || !message.trim()) return;

    const targetRoom = (room || user.currentRoom || 'general').toLowerCase();

    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: user.username,
      senderSocketId: socket.id,
      avatar: user.avatar,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      room: targetRoom
    };

    // Save to server history buffer
    addMessageToHistory(targetRoom, messageObj);

    // Broadcast to all participants in the room
    io.to(targetRoom).emit('chat:receive', messageObj);
  });

  // 2. Typing Indicator Start
  socket.on('typing:start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = (room || user.currentRoom || 'general').toLowerCase();

    // Broadcast "User is typing..." to everyone in the room except the typing user
    socket.to(targetRoom).emit('typing:update', {
      username: user.username,
      socketId: socket.id,
      isTyping: true,
      room: targetRoom
    });
  });

  // 3. Typing Indicator Stop
  socket.on('typing:stop', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = (room || user.currentRoom || 'general').toLowerCase();

    socket.to(targetRoom).emit('typing:update', {
      username: user.username,
      socketId: socket.id,
      isTyping: false,
      room: targetRoom
    });
  });

  // 4. Send Private Direct Message (DM)
  socket.on('direct:send', ({ recipientId, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !recipientId || !message || !message.trim()) return;

    const targetRecipient = connectedUsers.get(recipientId);

    const dmPayload = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      from: user.username,
      fromSocketId: socket.id,
      to: targetRecipient ? targetRecipient.username : 'User',
      toSocketId: recipientId,
      avatar: user.avatar,
      message: message.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    // Send privately to recipient socket
    io.to(recipientId).emit('direct:receive', dmPayload);

    // Send echo back to sender
    socket.emit('direct:sent', dmPayload);
  });
};
