// sockets/chatHandler.js
const { addMessageToHistory } = require('../utils/messageStore');

module.exports = (io, socket, connectedUsers) => {
  // Group channel message
  socket.on('chat:send', ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !message || !message.trim()) return;

    const targetRoom = room || user.currentRoom || 'general';
    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sender: user.username,
      senderId: socket.id,
      avatar: user.avatar,
      message: message.trim(),
      timestamp: timeString,
      room: targetRoom
    };

    // Save to history buffer
    addMessageToHistory(targetRoom, messageObj);

    // Broadcast message to all members in room
    io.to(targetRoom).emit('chat:receive', messageObj);
  });

  // Typing Start Indicator
  socket.on('typing:start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = room || user.currentRoom;
    if (targetRoom) {
      socket.to(targetRoom).emit('typing:update', {
        username: user.username,
        userId: socket.id,
        isTyping: true,
        room: targetRoom
      });
    }
  });

  // Typing Stop Indicator
  socket.on('typing:stop', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = room || user.currentRoom;
    if (targetRoom) {
      socket.to(targetRoom).emit('typing:update', {
        username: user.username,
        userId: socket.id,
        isTyping: false,
        room: targetRoom
      });
    }
  });

  // Direct Private Message
  socket.on('direct:send', ({ recipientId, message }) => {
    const sender = connectedUsers.get(socket.id);
    const recipient = connectedUsers.get(recipientId);

    if (!sender || !recipient || !message || !message.trim()) return;

    const now = new Date();
    const timeString = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

    const dmPayload = {
      id: `dm_${Date.now()}`,
      from: sender.username,
      fromId: socket.id,
      to: recipient.username,
      toId: recipientId,
      message: message.trim(),
      timestamp: timeString
    };

    // Deliver strictly to recipient socket
    io.to(recipientId).emit('direct:receive', dmPayload);
    // Confirm back to sender
    socket.emit('direct:sent', dmPayload);
  });
};
