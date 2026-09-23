/**
 * In-Memory Data Store for User Connections and Chat History
 */

// socketId -> { username, avatar, currentRoom }
const connectedUsers = new Map();

// Room chat history buffer
const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

/**
 * Adds a message object to the room history, maintaining the max limit of 50.
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
}

/**
 * Gets recent message history for a room.
 * @param {string} room 
 * @returns {Array}
 */
function getHistory(room) {
  return roomHistories[room] || [];
}

/**
 * Registers or updates user identity in connectedUsers.
 * @param {string} socketId 
 * @param {Object} userData 
 */
function setUser(socketId, userData) {
  const existing = connectedUsers.get(socketId) || {};
  connectedUsers.set(socketId, { ...existing, ...userData });
}

/**
 * Gets user details by socketId.
 * @param {string} socketId 
 * @returns {Object|undefined}
 */
function getUser(socketId) {
  return connectedUsers.get(socketId);
}

/**
 * Removes user entry upon disconnect.
 * @param {string} socketId 
 * @returns {Object|undefined}
 */
function removeUser(socketId) {
  const user = connectedUsers.get(socketId);
  connectedUsers.delete(socketId);
  return user;
}

/**
 * Returns list of active users in a specific room.
 * @param {string} room 
 * @returns {Array<{socketId: string, username: string, avatar: string}>}
 */
function getUsersInRoom(room) {
  const users = [];
  for (const [id, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push({
        socketId: id,
        username: user.username,
        avatar: user.avatar || '👤',
        currentRoom: user.currentRoom
      });
    }
  }
  return users;
}

module.exports = {
  connectedUsers,
  roomHistories,
  MAX_HISTORY,
  addMessageToHistory,
  getHistory,
  setUser,
  getUser,
  removeUser,
  getUsersInRoom
};
