const connectedUsers = new Map(); // socketId -> { username, avatar, currentRoom }

const getRoomUsers = (io, room) => {
  const users = [];
  for (const [id, u] of connectedUsers.entries()) {
    if (u.currentRoom === room) users.push(u.username);
  }
  return users;
};

const registerUserHandlers = (io, socket) => {
  socket.on('user:login', ({ username, avatar }) => {
    connectedUsers.set(socket.id, { username, avatar, currentRoom: null });
  });

  socket.on('room:join', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      io.to(user.currentRoom).emit('room:userlist', {
        room: user.currentRoom,
        users: getRoomUsers(io, user.currentRoom)
      });
    }

    socket.join(room);
    user.currentRoom = room;

    const { getHistory } = require('../utils/messageStore');
    socket.emit('room:history', { room, messages: getHistory(room) });

    io.to(room).emit('room:userlist', { room, users: getRoomUsers(io, room) });
  });

  socket.on('room:leave', ({ room }) => {
    socket.leave(room);
    const user = connectedUsers.get(socket.id);
    if (user) user.currentRoom = null;
    io.to(room).emit('room:userlist', { room, users: getRoomUsers(io, room) });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      io.to(user.currentRoom).emit('room:userlist', {
        room: user.currentRoom,
        users: getRoomUsers(io, user.currentRoom).filter(u => u !== user.username)
      });
    }
    connectedUsers.delete(socket.id);
  });
};

module.exports = { registerUserHandlers, connectedUsers, getRoomUsers };