

const { addMessageToHistory } = require("../utils/messageStore");
const { connectedUsers } = require("./userHandler");

let messageCounter = 0;
function nextMessageId() {
  messageCounter += 1;
  return `msg_${Date.now()}_${messageCounter}`;
}

function formatTimestamp() {
  const now = new Date();
  return now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function registerChatHandlers(io, socket) {

  socket.on("chat:send", ({ room, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit("error:message", { message: "Please log in before sending messages." });
      return;
    }
    if (!room || !message || !message.trim()) return;

    const messageObj = {
      id: nextMessageId(),
      sender: user.username,
      message: message.trim(),
      timestamp: formatTimestamp()
    };

    addMessageToHistory(room, messageObj);
    io.to(room).emit("chat:receive", { room, ...messageObj });
  });


  socket.on("typing:start", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;
    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: true
    });
  });

  socket.on("typing:stop", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;
    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: false
    });
  });


  socket.on("direct:send", ({ recipientId, message }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit("error:message", { message: "Please log in before sending messages." });
      return;
    }
    if (!recipientId || !message || !message.trim()) return;

    const recipientSocket = io.sockets.sockets.get(recipientId);
    if (!recipientSocket) {
      socket.emit("error:message", { message: "That user is no longer online." });
      return;
    }

    const payload = {
      from: user.username,
      message: message.trim(),
      timestamp: formatTimestamp()
    };


    io.to(recipientId).emit("direct:receive", payload);
    socket.emit("direct:receive", { ...payload, toSelf: true, recipientId });
  });
}

module.exports = { registerChatHandlers };
