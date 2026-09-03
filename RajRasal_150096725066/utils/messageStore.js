// utils/messageStore.js

const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
}

function getRoomHistory(room) {
  return roomHistories[room] || [];
}

module.exports = {
  addMessageToHistory,
  getRoomHistory,
  roomHistories
};
