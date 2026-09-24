// Socket handler for group messaging, direct messaging and typing indicators
const { addMessageToHistory } = require("../utils/messageStore");

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

module.exports = function (io, socket, connectedUsers) {

  // Handle group chat message in a channel
  socket.on("chat:send", (data) => {
    const { room, message } = data;
    if (!room || !message || !message.trim()) return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const messageObj = {
      id: "msg_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      sender: user.username,
      avatar: user.avatar,
      senderId: socket.id,
      message: message.trim(),
      timestamp: getCurrentTime(),
      room: room
    };

    // Store in room history buffer
    addMessageToHistory(room, messageObj);

    // Broadcast message to everyone in the room (including sender)
    io.to(room).emit("chat:receive", messageObj);
  });

  // Handle typing started
  socket.on("typing:start", (data) => {
    const { room } = data;
    const user = connectedUsers.get(socket.id);
    if (!room || !user) return;

    // Relay typing status to others in room
    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: true,
      room: room
    });
  });

  // Handle typing stopped
  socket.on("typing:stop", (data) => {
    const { room } = data;
    const user = connectedUsers.get(socket.id);
    if (!room || !user) return;

    socket.to(room).emit("typing:update", {
      username: user.username,
      isTyping: false,
      room: room
    });
  });

  // Handle private direct messaging
  socket.on("direct:send", (data) => {
    const { recipientId, message } = data;
    if (!recipientId || !message || !message.trim()) return;

    const sender = connectedUsers.get(socket.id);
    const recipient = connectedUsers.get(recipientId);
    if (!sender || !recipient) return;

    const dmObj = {
      id: "dm_" + Date.now() + "_" + Math.random().toString(36).substring(2, 6),
      from: sender.username,
      fromAvatar: sender.avatar,
      fromId: socket.id,
      toId: recipientId,
      toUsername: recipient.username,
      message: message.trim(),
      timestamp: getCurrentTime(),
      isDirect: true
    };

    // Deliver to recipient socket
    io.to(recipientId).emit("direct:receive", dmObj);

    // Also send back to sender for local UI display
    socket.emit("direct:receive", dmObj);
  });
};
