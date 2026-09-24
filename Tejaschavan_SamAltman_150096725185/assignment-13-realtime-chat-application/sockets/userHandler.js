// sockets/userHandler.js
const { connectedUsers } = require('./presenceStore');
const { getHistory } = require('../utils/messageStore');

/**
 * Returns the list of users currently in the specified room.
 * Each entry includes socketId, username, and avatar.
 */
function getRoomUsers(room) {
  const users = [];
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push({
        socketId,
        username: user.username,
        avatar: user.avatar
      });
    }
  }
  return users;
}

/**
 * Registers user and room session event listeners for a socket.
 * @param {import('socket.io').Server} io
 * @param {import('socket.io').Socket} socket
 */
function registerUserHandlers(io, socket) {
  // Handle user login / session registration
  socket.on('user:login', (data) => {
    const { username, avatar } = data || {};
    if (!username || typeof username !== 'string' || !username.trim()) {
      socket.emit('error', { message: 'Username is required and cannot be empty.' });
      return;
    }

    const trimmedUsername = username.trim();
    const userAvatar = avatar || '👤';

    connectedUsers.set(socket.id, {
      username: trimmedUsername,
      avatar: userAvatar,
      currentRoom: null
    });

    socket.emit('user:login:success', {
      socketId: socket.id,
      username: trimmedUsername,
      avatar: userAvatar
    });
  });

  // Handle joining a room (one active room per socket model)
  socket.on('room:join', (data) => {
    const { room } = data || {};
    const user = connectedUsers.get(socket.id);

    if (!user) {
      socket.emit('error', { message: 'You must log in before joining a room.' });
      return;
    }

    if (!room || typeof room !== 'string') {
      socket.emit('error', { message: 'Valid room name is required.' });
      return;
    }

    const previousRoom = user.currentRoom;

    // If switching from another room, leave previous room and notify its members
    if (previousRoom && previousRoom !== room) {
      socket.leave(previousRoom);
      socket.to(previousRoom).emit('typing:update', {
        username: user.username,
        isTyping: false
      });
      io.to(previousRoom).emit('room:userlist', {
        room: previousRoom,
        users: getRoomUsers(previousRoom)
      });
    }

    // Join new room and update currentRoom
    socket.join(room);
    user.currentRoom = room;

    // Send chat history to the joining client only
    socket.emit('room:history', {
      room,
      messages: getHistory(room)
    });

    // Broadcast updated userlist to the entire room (including the joiner)
    io.to(room).emit('room:userlist', {
      room,
      users: getRoomUsers(room)
    });
  });

  // Handle leaving a room
  socket.on('room:leave', (data) => {
    const { room } = data || {};
    const user = connectedUsers.get(socket.id);

    if (!room) return;

    socket.leave(room);

    if (user && user.currentRoom === room) {
      user.currentRoom = null;
    }

    // Notify others in the room that typing stopped for this user
    if (user) {
      socket.to(room).emit('typing:update', {
        username: user.username,
        isTyping: false
      });
    }

    // Broadcast updated userlist to the remaining members of that room
    io.to(room).emit('room:userlist', {
      room,
      users: getRoomUsers(room)
    });
  });

  // Handle socket disconnection
  socket.on('disconnect', () => {
    const user = connectedUsers.get(socket.id);

    if (user) {
      const room = user.currentRoom;
      connectedUsers.delete(socket.id);

      if (room) {
        socket.to(room).emit('typing:update', {
          username: user.username,
          isTyping: false
        });
        io.to(room).emit('room:userlist', {
          room,
          users: getRoomUsers(room)
        });
      }
    }
  });
}

module.exports = { registerUserHandlers, getRoomUsers };
