const { connectedUsers, addMessageToHistory } = require("../utils/messageStore");

/**
 * Register chat & messaging socket event handlers
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerChatHandlers(io, socket) {
  // 1. Group Chat Message Dispatch
  socket.on("chat:send", ({ room, message }) => {
    if (!room || !message || !message.trim()) return;

    const user = connectedUsers.get(socket.id);
    const sender = user ? user.username : "Anonymous";
    const avatar = user ? user.avatar : "👤";

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const messageObj = {
      id: `msg_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      sender,
      avatar,
      senderSocketId: socket.id,
      room,
      message: message.trim(),
      timestamp
    };

    // Store in-memory history (up to MAX_HISTORY)
    addMessageToHistory(room, messageObj);

    // Broadcast to everyone in the room (including sender)
    io.to(room).emit("chat:receive", messageObj);
  });

  // 2. Typing Indicators (Scoper to room members excluding sender)
  socket.on("typing:start", ({ room }) => {
    if (!room) return;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: true,
      room
    });
  });

  socket.on("typing:stop", ({ room }) => {
    if (!room) return;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: false,
      room
    });
  });

  // 3. Direct Message (DM) Dispatch
  socket.on("direct:send", ({ recipientId, message }) => {
    if (!recipientId || !message || !message.trim()) return;

    const senderUser = connectedUsers.get(socket.id);
    const recipientUser = connectedUsers.get(recipientId);

    const senderName = senderUser ? senderUser.username : "Anonymous";
    const senderAvatar = senderUser ? senderUser.avatar : "👤";
    const recipientName = recipientUser ? recipientUser.username : "Unknown";

    const timestamp = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit"
    });

    const dmPayload = {
      id: `dm_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      from: senderName,
      fromAvatar: senderAvatar,
      fromSocketId: socket.id,
      toSocketId: recipientId,
      recipientName: recipientName,
      message: message.trim(),
      timestamp
    };

    // Deliver exclusively to the target recipient socket
    io.to(recipientId).emit("direct:receive", dmPayload);

    // Echo back to sender so sender's DM thread displays their own message
    io.to(socket.id).emit("direct:receive", {
      ...dmPayload,
      from: "You",
      isSelf: true
    });
  });
}

module.exports = { registerChatHandlers };
