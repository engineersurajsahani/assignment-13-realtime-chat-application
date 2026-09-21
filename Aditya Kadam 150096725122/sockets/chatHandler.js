const { getUser, findByUsername, getUsersInRoom } = require('./userHandler');

const typingUsers = new Map();

function handleSendMessage(socket, io, messageStore, data) {
  const { room, message } = data;
  const user = getUser(socket.id);
  
  if (!user || user.currentRoom !== room) {
    socket.emit('error', { message: 'You are not in this room' });
    return;
  }

  const chatMessage = {
    id: Date.now() + Math.random(),
    sender: user.username,
    avatar: user.avatar,
    message,
    timestamp: new Date().toISOString(),
    type: 'chat'
  };

  messageStore.addMessage(room, chatMessage);
  io.to(room).emit('chat:receive', chatMessage);
}

function handleTypingStart(socket, io, data) {
  const { room } = data;
  const user = getUser(socket.id);

  if (!user || user.currentRoom !== room) return;

  const key = `${room}:${socket.id}`;
  typingUsers.set(key, user.username);

  socket.to(room).emit('typing:update', { username: user.username, isTyping: true });
}

function handleTypingStop(socket, io, data) {
  const { room } = data;
  const user = getUser(socket.id);

  if (!user) return;

  const key = `${room}:${socket.id}`;
  typingUsers.delete(key);

  socket.to(room).emit('typing:update', { username: user.username, isTyping: false });
}

function handleDirectMessage(socket, io, data) {
  const { recipientId, message } = data;
  const sender = getUser(socket.id);

  if (!sender) {
    socket.emit('error', { message: 'Please login first' });
    return;
  }

  const recipient = getUser(recipientId);
  if (!recipient) {
    socket.emit('error', { message: 'Recipient not found' });
    return;
  }

  const dmMessage = {
    id: Date.now() + Math.random(),
    from: sender.username,
    fromId: socket.id,
    message,
    timestamp: new Date().toISOString(),
    type: 'direct'
  };

  socket.to(recipientId).emit('direct:receive', dmMessage);
  socket.emit('direct:sent', dmMessage);
}

module.exports = {
  handleSendMessage,
  handleTypingStart,
  handleTypingStop,
  handleDirectMessage
};
