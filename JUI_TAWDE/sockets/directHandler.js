const { createMessage, addToHistory, getHistory } = require("../utils/messageStore");
const { makeDmKey } = require("../utils/groupStore");

function register(io, socket, state) {
  socket.on("direct:history", ({ recipientId } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    const recipient = state.connectedUsers.get(recipientId);
    if (!user || !recipient) return socket.emit("app:error", { message: "User is not online." });

    const key = makeDmKey(socket.id, recipientId);
    socket.emit("direct:history", {
      recipientId,
      messages: getHistory(state.dmHistories, key)
    });
  });

  socket.on("direct:send", ({ recipientId, message } = {}) => {
    const sender = state.connectedUsers.get(socket.id);
    const recipient = state.connectedUsers.get(recipientId);
    message = String(message || "").trim().slice(0, 2000);

    if (!sender || !recipient || !message) return;

    const msg = createMessage({
      sender: sender.username,
      senderId: sender.id,
      message,
      room: `dm:${makeDmKey(sender.id, recipient.id)}`
    });

    const key = makeDmKey(sender.id, recipient.id);
    addToHistory(state.dmHistories, key, msg);

    socket.emit("direct:receive", {
      ...msg,
      from: sender.username,
      recipientId: recipient.id
    });

    io.to(recipient.id).emit("direct:receive", {
      ...msg,
      from: sender.username,
      recipientId: recipient.id
    });
  });
}

module.exports = register;
