const crypto = require("crypto");

const MAX_HISTORY = 50;

function id(prefix = "msg") {
  return `${prefix}_${crypto.randomBytes(6).toString("hex")}`;
}

function now() {
  return new Date().toISOString();
}

function createMessage({ sender, senderId, message, room, type = "text" }) {
  return {
    id: id(),
    sender,
    senderId,
    message,
    room,
    type,
    timestamp: now()
  };
}

function addToHistory(map, key, message) {
  if (!map.has(key)) map.set(key, []);
  const history = map.get(key);
  history.push(message);
  if (history.length > MAX_HISTORY) history.splice(0, history.length - MAX_HISTORY);
}

function getHistory(map, key) {
  return map.get(key) || [];
}

module.exports = { MAX_HISTORY, id, now, createMessage, addToHistory, getHistory };
