const {
  addUser,
  getUser,
  setUserRoom,
  removeUser,
  getUsersInRoom,
  getRoomHistory,
  getAllUsers
} = require('../utils/messageStore');

/**
 * Registers user management, room joining/leaving, and disconnect handlers.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
module.exports = function registerUserHandlers(io, socket) {
  // Event: user:login
  socket.on('user:login', (data) => {
    const { username, avatar } = data || {};
    const user = addUser(socket.id, { username, avatar });
    
    socket.emit('user:login_success', {
      user,
      allUsers: getAllUsers()
    });

    // Broadcast updated global user list to everyone for DM availability
    io.emit('users:all', { users: getAllUsers() });
  });

  // Event: room:join
  socket.on('room:join', (data) => {
    const { room } = data || {};
    if (!room) return;

    const user = getUser(socket.id);
    const previousRoom = user ? user.currentRoom : null;

    // Leave previous room if different
    if (previousRoom && previousRoom !== room) {
      socket.leave(previousRoom);
      io.to(previousRoom).emit('room:userlist', {
        room: previousRoom,
        users: getUsersInRoom(previousRoom)
      });
      // Clear typing indicator in previous room
      if (user) {
        socket.to(previousRoom).emit('typing:update', {
          username: user.username,
          isTyping: false,
          room: previousRoom
        });
      }
    }

    // Join target room
    socket.join(room);
    setUserRoom(socket.id, room);

    // Hydrate message history to joining client
    const messages = getRoomHistory(room);
    socket.emit('room:history', {
      room,
      messages
    });

    // Broadcast updated user list to room
    io.to(room).emit('room:userlist', {
      room,
      users: getUsersInRoom(room)
    });

    // Also update global user list for DMs
    io.emit('users:all', { users: getAllUsers() });
  });

  // Event: room:leave
  socket.on('room:leave', (data) => {
    const { room } = data || {};
    const user = getUser(socket.id);

    if (room) {
      socket.leave(room);
      if (user && user.currentRoom === room) {
        setUserRoom(socket.id, null);
      }

      // Notify room members
      io.to(room).emit('room:userlist', {
        room,
        users: getUsersInRoom(room)
      });

      if (user) {
        socket.to(room).emit('typing:update', {
          username: user.username,
          isTyping: false,
          room
        });
      }
    }
  });

  // Event: disconnect
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user && user.currentRoom) {
      const room = user.currentRoom;
      io.to(room).emit('room:userlist', {
        room,
        users: getUsersInRoom(room)
      });

      socket.to(room).emit('typing:update', {
        username: user.username,
        isTyping: false,
        room
      });
    }

    // Broadcast updated global user list
    io.emit('users:all', { users: getAllUsers() });
  });
};
