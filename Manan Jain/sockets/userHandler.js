// sockets/userHandler.js
const { getRoomHistory } = require('../utils/messageStore');

module.exports = (io, socket, connectedUsers) => {
  // User Login / Registration on connect
  socket.on('user:login', ({ username, avatar }) => {
    const userObj = {
      socketId: socket.id,
      username: username || `User_${socket.id.slice(0, 4)}`,
      avatar: avatar || '👤',
      currentRoom: null
    };

    connectedUsers.set(socket.id, userObj);
    socket.emit('user:authenticated', userObj);
  });

  // Join channel room
  socket.on('room:join', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = room || 'general';

    // Leave previous room if any
    if (user.currentRoom && user.currentRoom !== targetRoom) {
      socket.leave(user.currentRoom);
      broadcastRoomUsers(io, user.currentRoom, connectedUsers);
    }

    socket.join(targetRoom);
    user.currentRoom = targetRoom;

    // 1. Emit recent message history buffer to joined user
    const history = getRoomHistory(targetRoom);
    socket.emit('room:history', {
      room: targetRoom,
      messages: history
    });

    // 2. Broadcast updated user list to everyone in room
    broadcastRoomUsers(io, targetRoom, connectedUsers);
  });

  // Leave room
  socket.on('room:leave', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const targetRoom = room || user.currentRoom;
    if (targetRoom) {
      socket.leave(targetRoom);
      user.currentRoom = null;
      broadcastRoomUsers(io, targetRoom, connectedUsers);
    }
  });

  // Disconnect
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const lastRoom = user.currentRoom;
      connectedUsers.delete(socket.id);
      if (lastRoom) {
        broadcastRoomUsers(io, lastRoom, connectedUsers);
      }
    }
  });
};

function broadcastRoomUsers(io, room, connectedUsers) {
  const usersInRoom = [];
  for (const [sId, u] of connectedUsers.entries()) {
    if (u.currentRoom === room) {
      usersInRoom.push({ socketId: sId, username: u.username, avatar: u.avatar });
    }
  }

  io.to(room).emit('room:userlist', {
    room,
    users: usersInRoom
  });
}
