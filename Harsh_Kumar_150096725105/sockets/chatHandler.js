const { addMessageToHistory } = require('../utils/messageStore');
const { connectedUsers } = require('./userHandler');

module.exports = (io, socket) => {
  socket.on('chat:send', ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const messageObj = {
      id: `msg_${Date.now()}_${Math.floor(Math.random()*1000)}`,
      sender: user.username,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    addMessageToHistory(room, messageObj);
    io.to(room).emit('chat:receive', messageObj);
  });

  socket.on('typing:start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    socket.to(room).emit('typing:update', { username: user.username, isTyping: true });
  });

  socket.on('typing:stop', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    socket.to(room).emit('typing:update', { username: user.username, isTyping: false });
  });

  socket.on('direct:send', ({ recipientId, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    io.to(recipientId).emit('direct:receive', {
      from: user.username,
      message,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    });
  });
};
