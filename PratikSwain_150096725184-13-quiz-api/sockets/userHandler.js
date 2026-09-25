/**
 * User & Room Presence Socket Handler
 * Student: Pratik Swain (150096725184)
 * Track: Backend & Real-Time Web | Assignment 13
 */

const {
  addUser,
  getUser,
  removeUser,
  setUserRoom,
  getUsersInRoom,
  getRoomUsernames,
  getAllUsers,
  getRoomHistory,
  getAvailableRooms,
  createRoom
} = require('../utils/messageStore');

function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

module.exports = function registerUserHandlers(io, socket) {
  /**
   * user:login - Client -> Server
   * Payload: { "username": "Aarav", "avatar": "avatar1.png" }
   */
  socket.on('user:login', (data = {}) => {
    try {
      const username = (data.username || `User_${socket.id.slice(0, 4)}`).trim();
      const avatar = data.avatar || 'avatar1.png';
      const user = addUser(socket.id, { username, avatar });

      // Send confirmation to the logged-in client
      socket.emit('user:login:success', {
        user,
        availableRooms: getAvailableRooms(),
        onlineUsers: getAllUsers()
      });

      // Broadcast global online users update
      io.emit('users:online', {
        users: getAllUsers()
      });

      console.log(`[LOGIN] User "${user.username}" (${socket.id}) logged in`);
    } catch (err) {
      console.error('[LOGIN ERROR]', err);
      socket.emit('error', { message: 'Failed to complete login.' });
    }
  });

  /**
   * room:join - Client -> Server
   * Payload: { "room": "developers" }
   */
  socket.on('room:join', ({ room } = {}) => {
    try {
      if (!room) return;
      const targetRoom = room.trim().toLowerCase();
      createRoom(targetRoom);

      const user = getUser(socket.id);
      const oldRoom = user ? user.currentRoom : null;

      // If user is already in another room, leave it first
      if (oldRoom && oldRoom !== targetRoom) {
        socket.leave(oldRoom);
        if (user) {
          // Notify old room about leave
          const oldRoomUsernames = getRoomUsernames(oldRoom).filter(name => name !== user.username);
          io.to(oldRoom).emit('room:userlist', {
            room: oldRoom,
            users: oldRoomUsernames,
            members: getUsersInRoom(oldRoom).filter(u => u.socketId !== socket.id)
          });

          io.to(oldRoom).emit('chat:receive', {
            id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            sender: 'System',
            message: `${user.username} left #${oldRoom}`,
            timestamp: formatTime(),
            system: true,
            room: oldRoom
          });
        }
      }

      // Join the new room
      socket.join(targetRoom);
      setUserRoom(socket.id, targetRoom);

      // Hydrate message history buffer to joined user
      const history = getRoomHistory(targetRoom);
      socket.emit('room:history', {
        room: targetRoom,
        messages: history
      });

      // Broadcast updated online users list in the room
      const roomUsers = getRoomUsernames(targetRoom);
      const roomMembers = getUsersInRoom(targetRoom);

      io.to(targetRoom).emit('room:userlist', {
        room: targetRoom,
        users: roomUsers,
        members: roomMembers
      });

      // Announce join to room participants
      if (user) {
        socket.broadcast.to(targetRoom).emit('chat:receive', {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sender: 'System',
          message: `${user.username} joined #${targetRoom}`,
          timestamp: formatTime(),
          system: true,
          room: targetRoom
        });
      }

      // Emit room list update if a dynamic room was created
      io.emit('room:list', { rooms: getAvailableRooms() });

      console.log(`[ROOM JOIN] ${user ? user.username : socket.id} joined #${targetRoom}`);
    } catch (err) {
      console.error('[ROOM JOIN ERROR]', err);
    }
  });

  /**
   * room:leave - Client -> Server
   * Payload: { "room": "developers" }
   */
  socket.on('room:leave', ({ room } = {}) => {
    try {
      if (!room) return;
      const targetRoom = room.trim().toLowerCase();
      const user = getUser(socket.id);

      socket.leave(targetRoom);
      if (user && user.currentRoom === targetRoom) {
        setUserRoom(socket.id, null);
      }

      // Broadcast updated roster to the room
      io.to(targetRoom).emit('room:userlist', {
        room: targetRoom,
        users: getRoomUsernames(targetRoom),
        members: getUsersInRoom(targetRoom)
      });

      if (user) {
        io.to(targetRoom).emit('chat:receive', {
          id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
          sender: 'System',
          message: `${user.username} left #${targetRoom}`,
          timestamp: formatTime(),
          system: true,
          room: targetRoom
        });
      }

      console.log(`[ROOM LEAVE] ${user ? user.username : socket.id} left #${targetRoom}`);
    } catch (err) {
      console.error('[ROOM LEAVE ERROR]', err);
    }
  });

  /**
   * room:create - Dynamically create and list rooms
   */
  socket.on('room:create', ({ room } = {}) => {
    if (!room) return;
    const clean = createRoom(room);
    io.emit('room:list', { rooms: getAvailableRooms() });
    socket.emit('room:created', { room: clean });
  });

  /**
   * disconnect - Handle client connection drop
   */
  socket.on('disconnect', () => {
    try {
      const user = removeUser(socket.id);
      if (user) {
        console.log(`[DISCONNECT] ${user.username} (${socket.id}) disconnected`);
        if (user.currentRoom) {
          const room = user.currentRoom;
          // Clear typing state in room
          socket.broadcast.to(room).emit('typing:update', {
            username: user.username,
            isTyping: false,
            room
          });

          // Broadcast updated room user roster
          io.to(room).emit('room:userlist', {
            room,
            users: getRoomUsernames(room),
            members: getUsersInRoom(room)
          });

          // System message in room
          io.to(room).emit('chat:receive', {
            id: `sys_${Date.now()}_${Math.random().toString(36).substr(2, 4)}`,
            sender: 'System',
            message: `${user.username} went offline`,
            timestamp: formatTime(),
            system: true,
            room
          });
        }
      }

      // Update global online users for all remaining clients
      io.emit('users:online', {
        users: getAllUsers()
      });
    } catch (err) {
      console.error('[DISCONNECT ERROR]', err);
    }
  });
};
