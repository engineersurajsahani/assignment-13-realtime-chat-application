const crypto = require("crypto");
const {
  addMessageToHistory
} = require("../utils/messageStore");

const typingTimers = new Map();

function makeMessageId() {
  return `msg_${crypto.randomBytes(6).toString("hex")}`;
}

function getTime() {
  return new Date().toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit"
  });
}

function registerChatHandlers(io, socket, connectedUsers) {
  socket.on("chat:send", ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    const cleanRoom = String(room || "").trim().toLowerCase();
    const cleanMessage = String(message || "").trim();

    if (!user || !cleanRoom || !cleanMessage) return;

    const messageObj = {
      id: makeMessageId(),
      sender: user.username,
      message: cleanMessage,
      timestamp: getTime()
    };

    addMessageToHistory(cleanRoom, messageObj);
    io.to(cleanRoom).emit("chat:receive", messageObj);

    socket.to(cleanRoom).emit("typing:update", {
      username: user.username,
      isTyping: false
    });
  });

  socket.on("typing:start", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    const cleanRoom = String(room || "").trim().toLowerCase();

    if (!user || !cleanRoom) return;

    socket.to(cleanRoom).emit("typing:update", {
      username: user.username,
      isTyping: true
    });

    const key = `${socket.id}:${cleanRoom}`;

    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
    }

    const timer = setTimeout(() => {
      socket.to(cleanRoom).emit("typing:update", {
        username: user.username,
        isTyping: false
      });
      typingTimers.delete(key);
    }, 1800);

    typingTimers.set(key, timer);
  });

  socket.on("typing:stop", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    const cleanRoom = String(room || "").trim().toLowerCase();

    if (!user || !cleanRoom) return;

    const key = `${socket.id}:${cleanRoom}`;

    if (typingTimers.has(key)) {
      clearTimeout(typingTimers.get(key));
      typingTimers.delete(key);
    }

    socket.to(cleanRoom).emit("typing:update", {
      username: user.username,
      isTyping: false
    });
  });

  socket.on("direct:send", ({ recipientId, message }) => {
    const sender = connectedUsers.get(socket.id);
    const recipient = connectedUsers.get(recipientId);
    const cleanMessage = String(message || "").trim();

    if (!sender || !recipient || !cleanMessage) return;

    io.to(recipientId).emit("direct:receive", {
      from: sender.username,
      message: cleanMessage,
      timestamp: getTime()
    });

    socket.emit("direct:sent", {
      to: recipient.username,
      message: cleanMessage,
      timestamp: getTime()
    });
  });

  socket.on("disconnect", () => {
    for (const [key, timer] of typingTimers.entries()) {
      if (key.startsWith(`${socket.id}:`)) {
        clearTimeout(timer);
        typingTimers.delete(key);
      }
    }
  });
}

module.exports = registerChatHandlers;