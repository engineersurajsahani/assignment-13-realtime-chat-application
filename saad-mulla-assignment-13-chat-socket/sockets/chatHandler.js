const { addMessageToHistory } = require('../utils/messageStore');

function registerChatHandlers(io, socket, connectedUsers) {
  socket.on('chat:send', (data) => {
    const { room, message } = data;
    const user = connectedUsers.get(socket.id);

    if (!room || !message || !user) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const messageObj = {
      id: 'msg_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6),
      sender: user.username,
      senderId: socket.id,
      message,
      timestamp
    };

    addMessageToHistory(room, messageObj);
    io.to(room).emit('chat:receive', messageObj);
  });

  socket.on('typing:start', (data) => {
    const { room } = data;
    const user = connectedUsers.get(socket.id);
    if (!room || !user) return;

    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: true
    });
  });

  socket.on('typing:stop', (data) => {
    const { room } = data;
    const user = connectedUsers.get(socket.id);
    if (!room || !user) return;

    socket.to(room).emit('typing:update', {
      username: user.username,
      isTyping: false
    });
  });

  socket.on('direct:send', (data) => {
    const { recipientId, message } = data;
    const user = connectedUsers.get(socket.id);

    if (!recipientId || !message || !user) return;

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dmPayload = {
      from: user.username,
      fromId: socket.id,
      message,
      timestamp
    };

    io.to(recipientId).emit('direct:receive', dmPayload);

    socket.emit('direct:sent', {
      toId: recipientId,
      message,
      timestamp
    });
  });
}

module.exports = registerChatHandlers;