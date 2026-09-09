const roomHistories = {
  "general": [],
  "developers": [],
  "random": [],
  "tech": [],
  "gaming": []
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

function initRoom(room) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
}

module.exports = {
  roomHistories,
  MAX_HISTORY,
  addMessageToHistory,
  getRoomHistory,
  initRoom
};
