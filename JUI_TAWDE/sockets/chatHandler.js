const { createMessage, addToHistory } = require("../utils/messageStore");

function register(io, socket, state, publicRooms) {
  socket.on("chat:send", ({ room, message } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    room = String(room || "").replace(/^#/, "");
    message = String(message || "").trim().slice(0, 2000);

    if (!user || !message || !publicRooms.includes(room)) return;

    const msg = createMessage({
      sender: user.username,
      senderId: socket.id,
      message,
      room
    });

    addToHistory(state.roomHistories, room, msg);
    io.to(room).emit("chat:receive", msg);

    emitTypingStop(io, socket, room, user.username);
  });

  socket.on("typing:start", ({ room } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    room = String(room || "").replace(/^#/, "");
    if (!user || !room) return;

    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: true
    });

    clearTimeout(socket.data.typingTimers.get(room));
    socket.data.typingTimers.set(room, setTimeout(() => {
      emitTypingStop(io, socket, room, user.username);
    }, 1400));
  });

  socket.on("typing:stop", ({ room } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    room = String(room || "").replace(/^#/, "");
    if (!user || !room) return;

    emitTypingStop(io, socket, room, user.username);
  });
}

function emitTypingStop(io, socket, room, username) {
  clearTimeout(socket.data.typingTimers.get(room));
  socket.data.typingTimers.delete(room);
  socket.to(room).emit("typing:update", { username, isTyping: false });
}

module.exports = register;
