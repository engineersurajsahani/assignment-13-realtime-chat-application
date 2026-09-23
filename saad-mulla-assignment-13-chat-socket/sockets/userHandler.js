const { getRoomHistory } = require('../utils/messageStore');

function registerUserHandlers(io, socket, connectedUsers) {
  socket.on('user:login', (data) => {
    const username = data?.username || 'Anonymous';
    const avatar = data?.avatar || 'avatar1.png';

    connectedUsers.set(socket.id, {
      username,
      avatar,
      currentRoom: null
    });

    socket.emit('user:login:success', {
      socketId: socket.id,
      username,
      avatar
    });
  });

  socket.on('room:join', (data) => {
    const room = data?.room;
    if (!room) return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      broadcastRoomUserList(io, user.currentRoom, connectedUsers);
    }

    user.currentRoom = room;
    socket.join(room);

    const history = getRoomHistory(room);
    socket.emit('room:history', { room, messages: history });

    broadcastRoomUserList(io, room, connectedUsers);
  });

  socket.on('room:leave', (data) => {
    const room = data?.room;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    if (room && user.currentRoom === room) {
      socket.leave(room);
      user.currentRoom = null;
      broadcastRoomUserList(io, room, connectedUsers);
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const lastRoom = user.currentRoom;
      connectedUsers.delete(socket.id);
      if (lastRoom) {
        broadcastRoomUserList(io, lastRoom, connectedUsers);
      }
    }
  });
}

function broadcastRoomUserList(io, room, connectedUsers) {
  const usersInRoom = [];
  connectedUsers.forEach((userData, sId) => {
    if (userData.currentRoom === room) {
      usersInRoom.push({
        socketId: sId,
        username: userData.username,
        avatar: userData.avatar
      });
    }
  });

  io.to(room).emit('room:userlist', {
    room,
    users: usersInRoom
  });
}

module.exports = registerUserHandlers;