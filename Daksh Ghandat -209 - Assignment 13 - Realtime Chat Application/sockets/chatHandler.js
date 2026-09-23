const {
  createMessage,
  addMessageToHistory,
  persistMessage,
} = require("../utils/messageStore");
const { getRoomUsers } = require("./userHandler");

const TYPING_DEBOUNCE_MS = 2000;
const typingTimers = new Map();

const setupChatSocket = (io, socket, state) => {
  const { connectedUsers } = state;

  const getUser = () => connectedUsers.get(socket.id);

  const clearTypingTimer = () => {
    const timer = typingTimers.get(socket.id);
    if (timer) {
      clearTimeout(timer);
      typingTimers.delete(socket.id);
    }
  };

  const broadcastTyping = (room, username, isTyping) => {
    socket.to(room).emit("typing:update", { username, isTyping });
  };

  socket.on("chat:send", (payload) => {
    const user = getUser();
    if (!user) return;

    const room = (payload && payload.room || "").toString().trim();
    const text = (payload && payload.message || "").toString().trim();
    if (!room || !text || text.length > 1000 || !socket.rooms.has(room)) return;

    if (user.currentRoom !== room) return;

    const messageObj = createMessage(room, user.username, text, user.avatar);
    addMessageToHistory(room, messageObj);
    persistMessage(room, messageObj);

    io.to(room).emit("chat:receive", messageObj);

    broadcastTyping(room, user.username, false);
    clearTypingTimer();
  });

  socket.on("typing:start", (payload) => {
    const user = getUser();
    if (!user) return;

    const room = (payload && payload.room || "").toString().trim();
    if (!room || !socket.rooms.has(room)) return;

    clearTypingTimer();
    broadcastTyping(room, user.username, true);

    typingTimers.set(
      socket.id,
      setTimeout(() => {
        typingTimers.delete(socket.id);
        if (connectedUsers.has(socket.id)) {
          broadcastTyping(room, user.username, false);
        }
      }, TYPING_DEBOUNCE_MS)
    );
  });

  socket.on("typing:stop", (payload) => {
    const user = getUser();
    if (!user) return;

    const room = (payload && payload.room || "").toString().trim();
    if (!room || !typingTimers.has(socket.id)) return;

    clearTypingTimer();
    broadcastTyping(room, user.username, false);
  });

  socket.on("direct:send", (payload) => {
    const user = getUser();
    if (!user) return;

    const text = (payload && payload.message || "").toString().trim();
    if (!text) return;

    let recipient;
    if (payload && payload.recipientId) {
      recipient = connectedUsers.get(payload.recipientId);
    } else if (payload && payload.recipientName) {
      recipient = Array.from(connectedUsers.values()).find(
        (u) => u.username === payload.recipientName
      );
    }

    if (!recipient || recipient.socketId === socket.id) {
      socket.emit("direct:error", {
        message: "Recipient is not online",
        recipientId: payload && payload.recipientId,
        recipientName: payload && payload.recipientName,
      });
      return;
    }

    const payloadMsg = {
      id: `dm_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      from: user.username,
      fromAvatar: user.avatar,
      message: text,
      timestamp: new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
    };

    io.to(recipient.socketId).emit("direct:receive", payloadMsg);

    socket.emit("direct:sent", {
      id: payloadMsg.id,
      toSocketId: recipient.socketId,
      to: recipient.username,
      toAvatar: recipient.avatar,
      message: text,
      timestamp: payloadMsg.timestamp,
    });
  });

  socket.on("disconnect", () => {
    clearTypingTimer();
  });

  socket.on("user:list:query", (room) => {
    const validRoom = (room || "").toString().trim();
    if (!validRoom) return;
    socket.emit("room:userlist", {
      room: validRoom,
      users: getRoomUsers(connectedUsers, validRoom),
    });
  });
};

module.exports = { setupChatSocket, TYPING_DEBOUNCE_MS };