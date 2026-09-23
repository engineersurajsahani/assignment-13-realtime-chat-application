const crypto = require("crypto");
const fs = require("fs");
const path = require("path");
const mongoose = require("mongoose");
const Message = require("../models/Message");

const isDbConnected = () => mongoose.connection.readyState === 1;

const MAX_HISTORY = 50;
const DEFAULT_ROOMS = ["general", "developers", "random"];

const roomHistories = {};
for (const room of DEFAULT_ROOMS) {
  roomHistories[room] = [];
}

const now = () =>
  new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });

const createMessage = (room, sender, text, avatar = null) => ({
  id: `msg_${crypto.randomBytes(4).toString("hex")}`,
  room,
  sender,
  avatar,
  message: text,
  timestamp: now(),
});

function addMessageToHistory(room, messageObj) {
  if (!roomHistories[room]) roomHistories[room] = [];
  roomHistories[room].push(messageObj);
  if (roomHistories[room].length > MAX_HISTORY) {
    roomHistories[room].shift();
  }
}

async function persistMessage(room, messageObj) {
  if (!isDbConnected()) return;
  try {
    await Message.create({
      room,
      messageId: messageObj.id,
      sender: messageObj.sender,
      avatar: messageObj.avatar,
      message: messageObj.message,
      timestamp: messageObj.timestamp,
    });
  } catch (error) {
    console.error(`Failed to persist message to MongoDB: ${error.message}`);
  }
}

async function getRoomHistory(room) {
  if (!roomHistories[room]) roomHistories[room] = [];

  if (roomHistories[room].length === 0 && isDbConnected()) {
    try {
      const docs = await Message.find({ room })
        .sort({ _id: 1 })
        .limit(MAX_HISTORY);
      if (docs.length > 0) {
        roomHistories[room] = docs.map((d) => ({
          id: d.messageId,
          room: d.room,
          sender: d.sender,
          avatar: d.avatar,
          message: d.message,
          timestamp: d.timestamp,
        }));
      }
    } catch (error) {
      console.error(`Failed to hydrate history for room "${room}": ${error.message}`);
    }
  }

  return roomHistories[room];
}

const getHistoryLength = (room) => (roomHistories[room] || []).length;

function seedHistory() {
  const file = path.join(__dirname, "..", "data", "seedMessages.json");
  try {
    const data = JSON.parse(fs.readFileSync(file, "utf8"));
    for (const room of Object.keys(data)) {
      if (!roomHistories[room]) roomHistories[room] = [];
      if (roomHistories[room].length === 0) {
        roomHistories[room] = data[room]
          .slice(-MAX_HISTORY)
          .map((m) => ({ id: m.id, room, sender: m.sender, avatar: m.avatar, message: m.message, timestamp: m.timestamp }));
      }
    }
  } catch (error) {
    console.warn("No seed data loaded:", error.message);
  }
}

module.exports = {
  MAX_HISTORY,
  DEFAULT_ROOMS,
  roomHistories,
  createMessage,
  addMessageToHistory,
  persistMessage,
  getRoomHistory,
  getHistoryLength,
  seedHistory,
};