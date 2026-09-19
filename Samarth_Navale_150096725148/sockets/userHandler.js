const { connectedUsers, getRoomHistory, getRoomUsers } = require('../utils/messageStore');

const setupUserHandler = (io, socket) => {
  socket.on('user:login', ({ username, avatar }) => {
    const uname = (username || 'Anonymous').trim();
    connectedUsers.set(socket.id, {
      username: uname,
      avatar: avatar || 'avatar1.png',
      currentRoom: null
    });
    socket.emit('user:registered', { socketId: socket.id, username: uname });
  });

  socket.on('room:join', ({ room }) => {
    if (!room) return;
    const rName = String(room).trim().toLowerCase();

    const user = connectedUsers.get(socket.id) || {
      username: 'User_' + socket.id.slice(0, 4),
      avatar: 'avatar1.png',
      currentRoom: null
    };

    if (user.currentRoom && user.currentRoom !== rName) {
      socket.leave(user.currentRoom);
      const oldRoom = user.currentRoom;
      user.currentRoom = null;
      io.to(oldRoom).emit('room:userlist', {
        room: oldRoom,
        users: getRoomUsers(oldRoom).map((u) => u.username)
      });
    }

    socket.join(rName);
    user.currentRoom = rName;
    connectedUsers.set(socket.id, user);

    socket.emit('room:history', {
      room: rName,
      messages: getRoomHistory(rName)
    });

    io.to(rName).emit('room:userlist', {
      room: rName,
      users: getRoomUsers(rName).map((u) => u.username)
    });
  });

  socket.on('room:leave', ({ room }) => {
    if (!room) return;
    const rName = String(room).trim().toLowerCase();
    socket.leave(rName);

    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom === rName) {
      user.currentRoom = null;
    }

    io.to(rName).emit('room:userlist', {
      room: rName,
      users: getRoomUsers(rName).map((u) => u.username)
    });
  });

  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom) {
      const room = user.currentRoom;
      connectedUsers.delete(socket.id);
      io.to(room).emit('room:userlist', {
        room,
        users: getRoomUsers(room).map((u) => u.username)
      });
    } else {
      connectedUsers.delete(socket.id);
    }
  });
};

module.exports = { setupUserHandler };
