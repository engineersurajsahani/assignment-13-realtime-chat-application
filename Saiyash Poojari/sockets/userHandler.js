const { getRoomHistory, initRoom } = require('../utils/messageStore');

const connectedUsers = new Map();

function getRoomUserList(room) {
  const roomUsers = [];
  for (const [sId, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      roomUsers.push({
        socketId: sId,
        username: user.username,
        avatar: user.avatar,
        currentRoom: user.currentRoom
      });
    }
  }
  return roomUsers;
}

function getAllOnlineUsers() {
  const users = [];
  for (const [sId, user] of connectedUsers.entries()) {
    users.push({
      socketId: sId,
      username: user.username,
      avatar: user.avatar,
      currentRoom: user.currentRoom
    });
  }
  return users;
}

function registerUserHandlers(io, socket) {
  socket.on('user:login', (payload) => {
    const username = (payload && payload.username) ? payload.username.trim() : `User_${socket.id.substring(0, 4)}`;
    const avatar = (payload && payload.avatar) ? payload.avatar : 'avatar1.png';

    const userProfile = {
      socketId: socket.id,
      username: username,
      avatar: avatar,
      currentRoom: null
    };

    connectedUsers.set(socket.id, userProfile);

    socket.emit('user:login:success', userProfile);

    io.emit('users:online', getAllOnlineUsers());
  });

  socket.on('room:join', (payload) => {
    if (!payload || !payload.room) return;
    const newRoom = payload.room.trim();
    let userProfile = connectedUsers.get(socket.id);

    if (!userProfile) {
      userProfile = {
        socketId: socket.id,
        username: `Guest_${socket.id.substring(0, 4)}`,
        avatar: 'avatar1.png',
        currentRoom: null
      };
      connectedUsers.set(socket.id, userProfile);
    }

    const previousRoom = userProfile.currentRoom;

    if (previousRoom && previousRoom !== newRoom) {
      socket.leave(previousRoom);
      io.to(previousRoom).emit('room:userlist', {
        room: previousRoom,
        users: getRoomUserList(previousRoom)
      });
    }

    socket.join(newRoom);
    userProfile.currentRoom = newRoom;
    connectedUsers.set(socket.id, userProfile);

    initRoom(newRoom);

    socket.emit('room:history', {
      room: newRoom,
      messages: getRoomHistory(newRoom)
    });

    io.to(newRoom).emit('room:userlist', {
      room: newRoom,
      users: getRoomUserList(newRoom)
    });

    io.emit('users:online', getAllOnlineUsers());
  });

  socket.on('room:leave', (payload) => {
    if (!payload || !payload.room) return;
    const targetRoom = payload.room.trim();

    socket.leave(targetRoom);

    const userProfile = connectedUsers.get(socket.id);
    if (userProfile && userProfile.currentRoom === targetRoom) {
      userProfile.currentRoom = null;
      connectedUsers.set(socket.id, userProfile);
    }

    io.to(targetRoom).emit('room:userlist', {
      room: targetRoom,
      users: getRoomUserList(targetRoom)
    });

    io.emit('users:online', getAllOnlineUsers());
  });

  socket.on('disconnect', () => {
    const userProfile = connectedUsers.get(socket.id);
    if (userProfile) {
      const room = userProfile.currentRoom;
      connectedUsers.delete(socket.id);

      if (room) {
        io.to(room).emit('room:userlist', {
          room: room,
          users: getRoomUserList(room)
        });
      }

      io.emit('users:online', getAllOnlineUsers());
    }
  });
}

module.exports = {
  connectedUsers,
  getRoomUserList,
  getAllOnlineUsers,
  registerUserHandlers
};
