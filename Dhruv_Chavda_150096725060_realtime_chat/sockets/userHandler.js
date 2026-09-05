const { getRoomHistory, addMessageToHistory } = require('../utils/messageStore');

// Map of socketId -> { socketId, username, avatar, currentRoom }
const connectedUsers = new Map();

function getUsersInRoom(room) {
  const safeRoom = (room || 'general').toLowerCase();
  const users = [];
  for (const user of connectedUsers.values()) {
    if (user.currentRoom === safeRoom) {
      users.push(user);
    }
  }
  return users;
}

module.exports = function registerUserHandlers(io, socket) {
  // 1. User Identity Registration
  socket.on('user:login', ({ username, avatar }) => {
    const safeUsername = (username && username.trim()) || `User_${socket.id.substring(0, 4)}`;
    const safeAvatar = avatar || `https://api.dicebear.com/7.x/bottts/svg?seed=${encodeURIComponent(safeUsername)}`;

    const userData = {
      socketId: socket.id,
      username: safeUsername,
      avatar: safeAvatar,
      currentRoom: null
    };

    connectedUsers.set(socket.id, userData);
    socket.userData = userData;

    socket.emit('user:logged_in', {
      user: userData,
      availableRooms: ['general', 'developers', 'random']
    });

    console.log(`👤 User logged in: ${safeUsername} (${socket.id})`);
  });

  // 2. Join Specific Chat Channel
  socket.on('room:join', ({ room }) => {
    const targetRoom = (room && room.trim().toLowerCase()) || 'general';
    const user = connectedUsers.get(socket.id);

    if (!user) return;

    // Leave previous room if any
    if (user.currentRoom && user.currentRoom !== targetRoom) {
      const oldRoom = user.currentRoom;
      socket.leave(oldRoom);

      // Broadcast updated userlist in old room
      io.to(oldRoom).emit('room:userlist', {
        room: oldRoom,
        users: getUsersInRoom(oldRoom)
      });
    }

    // Join target room
    socket.join(targetRoom);
    user.currentRoom = targetRoom;

    // 1. Send recent message history buffer to the joined user
    const history = getRoomHistory(targetRoom);
    socket.emit('room:history', {
      room: targetRoom,
      messages: history
    });

    // 2. Broadcast updated roster of active users to everyone in the room
    const roomUsers = getUsersInRoom(targetRoom);
    io.to(targetRoom).emit('room:userlist', {
      room: targetRoom,
      users: roomUsers
    });

    // 3. Broadcast system notification that user joined
    const joinNotice = {
      id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
      sender: 'System',
      isSystem: true,
      message: `${user.username} joined the channel`,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    addMessageToHistory(targetRoom, joinNotice);
    socket.to(targetRoom).emit('chat:receive', joinNotice);

    console.log(`📢 ${user.username} joined #${targetRoom}`);
  });

  // 3. Leave Room
  socket.on('room:leave', ({ room }) => {
    const targetRoom = (room || '').toLowerCase();
    const user = connectedUsers.get(socket.id);

    if (user && user.currentRoom === targetRoom) {
      socket.leave(targetRoom);
      user.currentRoom = null;

      io.to(targetRoom).emit('room:userlist', {
        room: targetRoom,
        users: getUsersInRoom(targetRoom)
      });
    }
  });

  // 4. Disconnect Handler
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      const room = user.currentRoom;
      connectedUsers.delete(socket.id);

      if (room) {
        // Broadcast leave message and updated user roster
        const leaveNotice = {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
          sender: 'System',
          isSystem: true,
          message: `${user.username} left the chat`,
          timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        };
        addMessageToHistory(room, leaveNotice);
        io.to(room).emit('chat:receive', leaveNotice);

        io.to(room).emit('room:userlist', {
          room: room,
          users: getUsersInRoom(room)
        });
      }

      console.log(`🚪 User disconnected: ${user.username} (${socket.id})`);
    }
  });
};

module.exports.connectedUsers = connectedUsers;
