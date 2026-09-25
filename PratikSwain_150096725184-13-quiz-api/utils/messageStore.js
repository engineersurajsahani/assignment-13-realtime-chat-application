/**
 * In-Memory Message & User Presence Store
 * Student: Pratik Swain (150096725184)
 * Track: Backend & Real-Time Web | Assignment 13
 */

// In-Memory connected user registry: socketId -> { socketId, username, avatar, currentRoom, loginTime }
const connectedUsers = new Map();

// In-Memory message history buffers keyed by room name
const roomHistories = {
  "general": [],
  "developers": [],
  "random": [],
  "gaming": [],
  "tech": []
};

const MAX_HISTORY = 50;

/**
 * Register a user session
 * @param {string} socketId 
 * @param {Object} data - { username, avatar }
 * @returns {Object} user object
 */
function addUser(socketId, { username, avatar }) {
  const user = {
    socketId,
    username: (username || `User_${socketId.slice(0, 4)}`).trim(),
    avatar: avatar || 'avatar1.png',
    currentRoom: null,
    loginTime: new Date().toISOString()
  };
  connectedUsers.set(socketId, user);
  return user;
}

/**
 * Retrieve user by socketId
 * @param {string} socketId 
 * @returns {Object|undefined}
 */
function getUser(socketId) {
  return connectedUsers.get(socketId);
}

/**
 * Retrieve user by username
 * @param {string} username 
 * @returns {Object|undefined}
 */
function getUserByUsername(username) {
  for (const user of connectedUsers.values()) {
    if (user.username.toLowerCase() === username.toLowerCase()) {
      return user;
    }
  }
  return undefined;
}

/**
 * Remove user from registry
 * @param {string} socketId 
 * @returns {Object|undefined} removed user
 */
function removeUser(socketId) {
  const user = connectedUsers.get(socketId);
  if (user) {
    connectedUsers.delete(socketId);
  }
  return user;
}

/**
 * Update current active room for a user
 * @param {string} socketId 
 * @param {string} room 
 */
function setUserRoom(socketId, room) {
  const user = connectedUsers.get(socketId);
  if (user) {
    user.currentRoom = room;
  }
  return user;
}

/**
 * Get all connected users in a specific room
 * @param {string} room 
 * @returns {Array<Object>}
 */
function getUsersInRoom(room) {
  const users = [];
  for (const user of connectedUsers.values()) {
    if (user.currentRoom === room) {
      users.push({
        socketId: user.socketId,
        username: user.username,
        avatar: user.avatar,
        loginTime: user.loginTime
      });
    }
  }
  return users;
}

/**
 * Get array of usernames in a room (matches schema: ["Aarav", "Priya"])
 * @param {string} room 
 * @returns {Array<string>}
 */
function getRoomUsernames(room) {
  const names = [];
  for (const user of connectedUsers.values()) {
    if (user.currentRoom === room) {
      names.push(user.username);
    }
  }
  return names;
}

/**
 * Get all online users across all rooms
 * @returns {Array<Object>}
 */
function getAllUsers() {
  return Array.from(connectedUsers.values()).map(u => ({
    socketId: u.socketId,
    username: u.username,
    avatar: u.avatar,
    currentRoom: u.currentRoom,
    loginTime: u.loginTime
  }));
}

/**
 * Add a chat message to the room buffer (max 50)
 * @param {string} room 
 * @param {Object} messageObj 
 */
function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
  return messageObj;
}

/**
 * Get recent message history buffer for a room
 * @param {string} room 
 * @returns {Array<Object>}
 */
function getRoomHistory(room) {
  return roomHistories[room] ? [...roomHistories[room]] : [];
}

/**
 * Clear history for a room
 * @param {string} room 
 */
function clearRoomHistory(room) {
  if (roomHistories[room]) {
    roomHistories[room] = [];
    return true;
  }
  return false;
}

/**
 * List all available channels with stats
 * @returns {Array<Object>}
 */
function getRoomsWithStats() {
  return Object.keys(roomHistories).map(room => ({
    room,
    totalMessages: roomHistories[room].length,
    activeUsersCount: getUsersInRoom(room).length
  }));
}

/**
 * List all available channel names
 * @returns {Array<string>}
 */
function getAvailableRooms() {
  return Object.keys(roomHistories);
}

/**
 * Dynamically create a new room if it does not exist
 * @param {string} room 
 * @returns {string} normalized room name
 */
function createRoom(room) {
  const cleanRoom = room.trim().toLowerCase().replace(/[^a-z0-9-_]/g, '');
  if (cleanRoom && !roomHistories[cleanRoom]) {
    roomHistories[cleanRoom] = [];
  }
  return cleanRoom;
}

module.exports = {
  connectedUsers,
  roomHistories,
  MAX_HISTORY,
  addUser,
  getUser,
  getUserByUsername,
  removeUser,
  setUserRoom,
  getUsersInRoom,
  getRoomUsernames,
  getAllUsers,
  addMessageToHistory,
  getRoomHistory,
  clearRoomHistory,
  getRoomsWithStats,
  getAvailableRooms,
  createRoom
};
