// In-memory message history buffer management

const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

// Add message to room history buffer (caps at MAX_HISTORY)
function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
}

// Get recent history for a room
function getRoomHistory(room) {
  return roomHistories[room] || [];
}

module.exports = {
  addMessageToHistory,
  getRoomHistory,
  roomHistories
};
