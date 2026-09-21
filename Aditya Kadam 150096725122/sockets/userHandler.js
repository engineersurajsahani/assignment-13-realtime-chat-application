const connectedUsers = new Map();

function getUser(socketId) {
  return connectedUsers.get(socketId);
}

function setUser(socketId, userData) {
  connectedUsers.set(socketId, userData);
}

function removeUser(socketId) {
  connectedUsers.delete(socketId);
}

function getUsersInRoom(room) {
  const users = [];
  connectedUsers.forEach((userData, socketId) => {
    if (userData.currentRoom === room) {
      users.push({
        id: socketId,
        username: userData.username,
        avatar: userData.avatar
      });
    }
  });
  return users;
}

function findByUsername(username) {
  let foundUser = null;
  connectedUsers.forEach((userData, socketId) => {
    if (userData.username === username) {
      foundUser = { id: socketId, ...userData };
    }
  });
  return foundUser;
}

function handleLogin(socket, io, data) {
  const { username, avatar } = data;
  
  const existing = findByUsername(username);
  if (existing) {
    socket.emit('error', { message: 'Username already taken' });
    return false;
  }

  setUser(socket.id, {
    username,
    avatar: avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${username}`,
    currentRoom: null
  });

  socket.emit('user:loggedin', { username, id: socket.id });
  return true;
}

function handleJoinRoom(socket, io, messageStore, data) {
  const { room } = data;
  const user = getUser(socket.id);
  
  if (!user) {
    socket.emit('error', { message: 'Please login first' });
    return;
  }

  if (user.currentRoom) {
    socket.leave(user.currentRoom);
    const prevRoomUsers = getUsersInRoom(user.currentRoom);
    io.to(user.currentRoom).emit('room:userlist', { room: user.currentRoom, users: prevRoomUsers });
  }

  socket.join(room);
  user.currentRoom = room;

  const history = messageStore.getHistory(room);
  socket.emit('room:history', { room, messages: history });

  const users = getUsersInRoom(room);
  io.to(room).emit('room:userlist', { room, users });

  const systemMessage = {
    id: Date.now(),
    sender: 'System',
    message: `${user.username} joined the room`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };
  messageStore.addMessage(room, systemMessage);
  io.to(room).emit('chat:receive', systemMessage);
}

function handleLeaveRoom(socket, io, messageStore) {
  const user = getUser(socket.id);
  
  if (!user || !user.currentRoom) {
    return;
  }

  const room = user.currentRoom;
  socket.leave(room);
  user.currentRoom = null;

  const users = getUsersInRoom(room);
  io.to(room).emit('room:userlist', { room, users });

  const systemMessage = {
    id: Date.now(),
    sender: 'System',
    message: `${user.username} left the room`,
    timestamp: new Date().toISOString(),
    type: 'system'
  };
  messageStore.addMessage(room, systemMessage);
  io.to(room).emit('chat:receive', systemMessage);
}

function handleDisconnect(socket, io, messageStore) {
  const user = getUser(socket.id);
  
  if (user) {
    if (user.currentRoom) {
      const room = user.currentRoom;
      socket.leave(room);
      
      const users = getUsersInRoom(room);
      io.to(room).emit('room:userlist', { room, users });

      const systemMessage = {
        id: Date.now(),
        sender: 'System',
        message: `${user.username} disconnected`,
        timestamp: new Date().toISOString(),
        type: 'system'
      };
      messageStore.addMessage(room, systemMessage);
      io.to(room).emit('chat:receive', systemMessage);
    }
    removeUser(socket.id);
  }
}

module.exports = {
  getUser,
  setUser,
  removeUser,
  getUsersInRoom,
  findByUsername,
  connectedUsers,
  handleLogin,
  handleJoinRoom,
  handleLeaveRoom,
  handleDisconnect
};
