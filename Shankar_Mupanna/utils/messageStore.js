// In-Memory Chat State & History Store
const connectedUsers = new Map(); // socketId -> { socketId, username, avatar, currentRoom }

const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

/**
 * Adds a message object to a room's history buffer, capping at MAX_HISTORY.
 * @param {string} room 
 * @param {object} messageObj 
 */
function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
}

/**
 * Returns room message history array.
 * @param {string} room 
 * @returns {Array}
 */
function getRoomHistory(room) {
  return roomHistories[room] || [];
}

/**
 * Registers or updates a connected user.
 * @param {string} socketId 
 * @param {object} userData 
 */
function addUser(socketId, userData) {
  const existing = connectedUsers.get(socketId) || {};
  const user = {
    socketId,
    username: userData.username || existing.username || 'Anonymous',
    avatar: userData.avatar || existing.avatar || 'avatar1.png',
    currentRoom: userData.currentRoom || existing.currentRoom || null
  };
  connectedUsers.set(socketId, user);
  return user;
}

/**
 * Gets a connected user by socket ID.
 * @param {string} socketId 
 */
function getUser(socketId) {
  return connectedUsers.get(socketId);
}

/**
 * Sets current room for user.
 * @param {string} socketId 
 * @param {string|null} room 
 */
function setUserRoom(socketId, room) {
  const user = connectedUsers.get(socketId);
  if (user) {
    user.currentRoom = room;
    connectedUsers.set(socketId, user);
  }
  return user;
}

/**
 * Removes user on disconnect.
 * @param {string} socketId 
 */
function removeUser(socketId) {
  const user = connectedUsers.get(socketId);
  connectedUsers.delete(socketId);
  return user;
}

/**
 * Returns list of users currently in a specific room.
 * @param {string} room 
 * @returns {Array}
 */
function getUsersInRoom(room) {
  const users = [];
  for (const [id, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push(user);
    }
  }
  return users;
}

/**
 * Returns list of all connected users across all rooms.
 * @returns {Array}
 */
function getAllUsers() {
  return Array.from(connectedUsers.values());
}

module.exports = {
  connectedUsers,
  roomHistories,
  MAX_HISTORY,
  addMessageToHistory,
  getRoomHistory,
  addUser,
  getUser,
  setUserRoom,
  removeUser,
  getUsersInRoom,
  getAllUsers
};
