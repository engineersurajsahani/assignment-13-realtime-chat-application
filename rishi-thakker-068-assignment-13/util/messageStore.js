const roomHistories = {
  general: [],
  developers: [],
  random: [],
};

const MAX_HISTORY = 50;

function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) roomHistories[room] = [];
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
}

function getHistory(room) {
  return roomHistories[room] || [];
}

module.exports = { roomHistories, addMessageToHistory, getHistory, MAX_HISTORY };
