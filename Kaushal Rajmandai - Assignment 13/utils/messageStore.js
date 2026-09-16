const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

const addMessageToHistory = (room, messageObj) => {
  if (!roomHistories[room]) roomHistories[room] = [];
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
};

const getHistory = (room) => roomHistories[room] || [];

module.exports = { addMessageToHistory, getHistory, roomHistories };