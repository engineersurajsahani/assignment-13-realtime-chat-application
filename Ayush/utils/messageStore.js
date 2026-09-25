

const MAX_HISTORY = 50;

const roomHistories = {
  general: [],
  developers: [],
  random: [],
  gaming: [],
  tech: []
};

function ensureRoom(room) {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
}

function addMessageToHistory(room, messageObj) {
  ensureRoom(room);
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
  return messageObj;
}

function getHistory(room) {
  ensureRoom(room);
  return roomHistories[room];
}

function listRooms() {
  return Object.keys(roomHistories);
}

module.exports = {
  MAX_HISTORY,
  addMessageToHistory,
  getHistory,
  listRooms,
  ensureRoom
};
