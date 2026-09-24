/**
 * Shared In-Memory Message & User Store
 */

const connectedUsers = new Map(); // socketId -> { username, avatar, currentRoom }
const roomHistories = {
  general: [],
  developers: [],
  random: []
};
const MAX_HISTORY = 50;

/**
 * Add a message to room history, keeping at most MAX_HISTORY messages
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
 * Get recent message history for a room
 * @param {string} room
 * @returns {Array}
 */
function getHistory(room) {
  return roomHistories[room] || [];
}

module.exports = {
  connectedUsers,
  roomHistories,
  addMessageToHistory,
  getHistory,
  MAX_HISTORY
};
