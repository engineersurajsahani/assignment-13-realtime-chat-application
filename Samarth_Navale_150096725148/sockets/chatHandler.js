const { connectedUsers, addMessageToHistory } = require('../utils/messageStore');

const formatTime = () => {
  const d = new Date();
  const hrs = String(d.getHours()).padStart(2, '0');
  const mins = String(d.getMinutes()).padStart(2, '0');
  return `${hrs}:${mins}`;
};

const setupChatHandler = (io, socket) => {
  socket.on('chat:send', ({ room, message }) => {
    if (!room || !message) return;
    const rName = String(room).trim().toLowerCase();
    const user = connectedUsers.get(socket.id);
    const sender = user ? user.username : 'Anonymous';

    const msgObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
      sender,
      message: String(message).trim(),
      timestamp: formatTime()
    };

    addMessageToHistory(rName, msgObj);

    io.to(rName).emit('chat:receive', msgObj);
  });

  socket.on('typing:start', ({ room }) => {
    if (!room) return;
    const rName = String(room).trim().toLowerCase();
    const user = connectedUsers.get(socket.id);
    const username = user ? user.username : 'Someone';

    socket.to(rName).emit('typing:update', {
      username,
      isTyping: true
    });
  });

  socket.on('typing:stop', ({ room }) => {
    if (!room) return;
    const rName = String(room).trim().toLowerCase();
    const user = connectedUsers.get(socket.id);
    const username = user ? user.username : 'Someone';

    socket.to(rName).emit('typing:update', {
      username,
      isTyping: false
    });
  });

  socket.on('direct:send', ({ recipientId, message }) => {
    if (!recipientId || !message) return;
    const user = connectedUsers.get(socket.id);
    const sender = user ? user.username : 'Anonymous';

    const dmObj = {
      from: sender,
      fromSocketId: socket.id,
      message: String(message).trim(),
      timestamp: formatTime()
    };

    io.to(recipientId).emit('direct:receive', dmObj);
  });
};

module.exports = { setupChatHandler };
