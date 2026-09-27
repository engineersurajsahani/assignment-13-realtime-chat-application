const connectedUsers = new Map();

function broadcastUserList(io, room) {
  const usersInRoom = [];
  connectedUsers.forEach((user, socketId) => {
    if (user.currentRoom === room) {
      usersInRoom.push(user.username);
    }
  });
  io.to(room).emit('room:userlist', { room, users: usersInRoom });
}

module.exports = (io, socket) => {
  socket.on('user:login', ({ username, avatar }) => {
    connectedUsers.set(socket.id, { username, avatar, currentRoom: null });
    // Tell the user their own socket ID for DM purposes
    socket.emit('user:connected', { id: socket.id });
  });

  socket.on('room:join', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    // Leave previous room if any
    if (user.currentRoom) {
      socket.leave(user.currentRoom);
      broadcastUserList(io, user.currentRoom);
    }

    user.currentRoom = room;
    socket.join(room);

    // Send history
    const { getRoomHistory } = require('../utils/messageStore');
    socket.emit('room:history', { room, messages: getRoomHistory(room) });

    broadcastUserList(io, room);
  });

  socket.on('room:leave', ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;
    
    if (user.currentRoom === room) {
      socket.leave(room);
      user.currentRoom = null;
      broadcastUserList(io, room);
    }
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const room = user.currentRoom;
      connectedUsers.delete(socket.id);
      broadcastUserList(io, room);
    } else {
      connectedUsers.delete(socket.id);
    }
  });
};

module.exports.connectedUsers = connectedUsers;
module.exports.broadcastUserList = broadcastUserList;
