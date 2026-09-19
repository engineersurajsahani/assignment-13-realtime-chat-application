const connectedUsers = new Map();

const roomHistories = {
  general: [],
  developers: [],
  random: []
};

const MAX_HISTORY = 50;

const addMessageToHistory = (room, messageObj) => {
  if (!roomHistories[room]) {
    roomHistories[room] = [];
  }
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
};

const getRoomHistory = (room) => {
  return roomHistories[room] || [];
};

const getRoomUsers = (room) => {
  const users = [];
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push({
        socketId,
        username: user.username,
        avatar: user.avatar
      });
    }
  }
  return users;
};

module.exports = {
  connectedUsers,
  roomHistories,
  addMessageToHistory,
  getRoomHistory,
  getRoomUsers
};
