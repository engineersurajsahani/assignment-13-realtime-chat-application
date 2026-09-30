const {
  connectedUsers
} = require("./userHandler");

const {
  addMessageToHistory,
  getRoomHistory
} = require("../utils/messageStore");

const typingTimers = new Map();

function setupChatHandlers(io, socket) {
  // Send a message to a room
  socket.on("chat:send", (data) => {
    const { room, message } = data;

    if (!room || !message) {
      return;
    }

    const user = connectedUsers.get(socket.id);

    if (!user) {
      socket.emit("error", {
        message: "Please login first"
      });
      return;
    }

    const messageObj = {
      id: `msg_${Date.now()}_${socket.id.slice(0, 5)}`,
      sender: user.username,
      message,
      timestamp: new Date().toLocaleTimeString()
    };

    addMessageToHistory(room, messageObj);

    io.to(room).emit("chat:receive", messageObj);

    // Stop typing after sending
    stopTyping(io, socket, room);
  });

  // Send recent room history to the joining user
  socket.on("room:history", (data) => {
    const { room } = data;

    if (!room) {
      return;
    }

    const messages = getRoomHistory(room);

    socket.emit("room:history", {
      room,
      messages
    });
  });

  // Typing started
  socket.on("typing:start", (data) => {
    const { room } = data;

    if (!room) {
      return;
    }

    const user = connectedUsers.get(socket.id);

    if (!user) {
      return;
    }

    socket.broadcast.to(room).emit("typing:update", {
      username: user.username,
      isTyping: true
    });

    // Clear existing timer
    if (typingTimers.has(socket.id)) {
      clearTimeout(typingTimers.get(socket.id));
    }

    // Automatically stop typing after 2 seconds
    const timer = setTimeout(() => {
      stopTyping(io, socket, room);
    }, 2000);

    typingTimers.set(socket.id, timer);
  });

  // Typing stopped
  socket.on("typing:stop", (data) => {
    const { room } = data;

    if (!room) {
      return;
    }

    stopTyping(io, socket, room);
  });

  // Direct message
  socket.on("direct:send", (data) => {
    const { recipientId, message } = data;

    if (!recipientId || !message) {
      return;
    }

    const user = connectedUsers.get(socket.id);

    if (!user) {
      socket.emit("error", {
        message: "Please login first"
      });
      return;
    }

    const recipient = connectedUsers.get(recipientId);

    if (!recipient) {
      socket.emit("error", {
        message: "Recipient is not online"
      });
      return;
    }

    io.to(recipientId).emit("direct:receive", {
      from: user.username,
      message,
      timestamp: new Date().toLocaleTimeString()
    });
  });

  // Clean up typing timer when user disconnects
  socket.on("disconnect", () => {
    if (typingTimers.has(socket.id)) {
      clearTimeout(typingTimers.get(socket.id));
      typingTimers.delete(socket.id);
    }
  });
}

function stopTyping(io, socket, room) {
  const user = connectedUsers.get(socket.id);

  if (!user) {
    return;
  }

  socket.broadcast.to(room).emit("typing:update", {
    username: user.username,
    isTyping: false
  });

  if (typingTimers.has(socket.id)) {
    clearTimeout(typingTimers.get(socket.id));
    typingTimers.delete(socket.id);
  }
}

module.exports = {
  setupChatHandlers
};