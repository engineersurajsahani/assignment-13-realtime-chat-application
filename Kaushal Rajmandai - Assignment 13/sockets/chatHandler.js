const { addMessageToHistory } = require('../utils/messageStore');
const { connectedUsers } = require('./userHandler');

const typingTimeouts = new Map();

const registerChatHandlers = (io, socket) => {
  socket.on('chat:send', ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      sender: user.username,
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    };

    addMessageToHistory(room, messageObj);
    io.to(room).emit('chat:receive', messageObj);
  });

  socket.on('typing:start', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to(room).emit('typing:update', { username: user.username, isTyping: true });

    const key = `${socket.id}:${room}`;
    if (typingTimeouts.has(key)) clearTimeout(typingTimeouts.get(key));

    const timeout = setTimeout(() => {
      socket.to(room).emit('typing:update', { username: user.username, isTyping: false });
      typingTimeouts.delete(key);
    }, 3000);

    typingTimeouts.set(key, timeout);
  });

  socket.on('typing:stop', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const key = `${socket.id}:${room}`;
    if (typingTimeouts.has(key)) {
      clearTimeout(typingTimeouts.get(key));
      typingTimeouts.delete(key);
    }

    socket.to(room).emit('typing:update', { username: user.username, isTyping: false });
  });

  socket.on('direct:send', ({ recipientId, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    io.to(recipientId).emit('direct:receive', {
      from: user.username,
      message,
      timestamp: new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })
    });
  });
};

module.exports = { registerChatHandlers };