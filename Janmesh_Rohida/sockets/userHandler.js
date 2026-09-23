const {
  setUser,
  getUser,
  removeUser,
  getUsersInRoom,
  getHistory
} = require('../utils/messageStore');

/**
 * Handles user authentication, room joins/leaves, and socket disconnections.
 * @param {import('socket.io').Server} io 
 * @param {import('socket.io').Socket} socket 
 */
function handleUserEvents(io, socket) {
  // Event: "user:login"
  socket.on('user:login', ({ username, avatar }) => {
    const cleanUsername = (username || 'Anonymous').trim();
    const cleanAvatar = avatar || '☕';
    
    setUser(socket.id, {
      username: cleanUsername,
      avatar: cleanAvatar,
      currentRoom: null
    });

    console.log(`[User Login] Socket ${socket.id} -> User: ${cleanUsername}`);
  });

  // Event: "room:join"
  socket.on('room:join', ({ room }) => {
    if (!room) return;

    const user = getUser(socket.id);
    const oldRoom = user ? user.currentRoom : null;

    // Leave old room if currently in a different room
    if (oldRoom && oldRoom !== room) {
      socket.leave(oldRoom);
      if (user) user.currentRoom = null;
      
      // Broadcast updated userlist to old room
      io.to(oldRoom).emit('room:userlist', {
        room: oldRoom,
        users: getUsersInRoom(oldRoom)
      });
      console.log(`[Room Leave] User ${user?.username} left room ${oldRoom}`);
    }

    // Join new room
    socket.join(room);
    if (user) {
      user.currentRoom = room;
    }

    // Emit room history ONLY to joining socket
    socket.emit('room:history', {
      room,
      messages: getHistory(room)
    });

    // Broadcast updated user list to everyone in the new room
    io.to(room).emit('room:userlist', {
      room,
      users: getUsersInRoom(room)
    });

    console.log(`[Room Join] User ${user?.username || socket.id} joined room #${room}`);
  });

  // Event: "room:leave"
  socket.on('room:leave', ({ room }) => {
    if (!room) return;

    const user = getUser(socket.id);
    socket.leave(room);

    if (user && user.currentRoom === room) {
      user.currentRoom = null;
    }

    // Broadcast updated user list to room
    io.to(room).emit('room:userlist', {
      room,
      users: getUsersInRoom(room)
    });

    console.log(`[Room Leave] User ${user?.username || socket.id} left room #${room}`);
  });

  // Event: "disconnect"
  socket.on('disconnect', () => {
    const user = removeUser(socket.id);
    if (user) {
      console.log(`[Disconnect] User ${user.username} (${socket.id}) disconnected.`);
      if (user.currentRoom) {
        io.to(user.currentRoom).emit('room:userlist', {
          room: user.currentRoom,
          users: getUsersInRoom(user.currentRoom)
        });
      }
    }
  });
}

module.exports = handleUserEvents;
