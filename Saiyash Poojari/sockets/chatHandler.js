const { addMessageToHistory } = require('../utils/messageStore');
const { connectedUsers } = require('./userHandler');

function registerChatHandlers(io, socket) {
  socket.on('chat:send', (payload) => {
    if (!payload || !payload.room || !payload.message) return;

    const room = payload.room.trim();
    const text = payload.message.trim();
    if (!text) return;

    const userProfile = connectedUsers.get(socket.id);
    const sender = userProfile ? userProfile.username : `User_${socket.id.substring(0, 4)}`;
    const avatar = userProfile ? userProfile.avatar : 'avatar1.png';

    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const msgId = `msg_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const messageObj = {
      id: msgId,
      sender: sender,
      avatar: avatar,
      senderSocketId: socket.id,
      room: room,
      message: text,
      timestamp: timestamp
    };

    addMessageToHistory(room, messageObj);

    io.to(room).emit('chat:receive', messageObj);
  });

  socket.on('typing:start', (payload) => {
    if (!payload || !payload.room) return;
    const room = payload.room.trim();
    const userProfile = connectedUsers.get(socket.id);
    const username = userProfile ? userProfile.username : 'Someone';

    socket.broadcast.to(room).emit('typing:update', {
      username: username,
      room: room,
      isTyping: true
    });
  });

  socket.on('typing:stop', (payload) => {
    if (!payload || !payload.room) return;
    const room = payload.room.trim();
    const userProfile = connectedUsers.get(socket.id);
    const username = userProfile ? userProfile.username : 'Someone';

    socket.broadcast.to(room).emit('typing:update', {
      username: username,
      room: room,
      isTyping: false
    });
  });

  socket.on('direct:send', (payload) => {
    if (!payload || !payload.recipientId || !payload.message) return;

    const recipientId = payload.recipientId.trim();
    const text = payload.message.trim();
    if (!text) return;

    const userProfile = connectedUsers.get(socket.id);
    const sender = userProfile ? userProfile.username : `User_${socket.id.substring(0, 4)}`;
    const avatar = userProfile ? userProfile.avatar : 'avatar1.png';
    const timestamp = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const dmId = `dm_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    const dmPayload = {
      id: dmId,
      from: sender,
      fromAvatar: avatar,
      fromSocketId: socket.id,
      recipientId: recipientId,
      message: text,
      timestamp: timestamp
    };

    io.to(recipientId).emit('direct:receive', dmPayload);

    socket.emit('direct:sent', dmPayload);
  });
}

module.exports = {
  registerChatHandlers
};
