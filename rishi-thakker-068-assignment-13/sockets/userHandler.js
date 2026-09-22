const { getHistory } = require("../util/messageStore");
const connectedUsers = new Map();

function broadcastUserList(io, room) {
  const users = [];
  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push({ userId: socketId, username: user.username });
    }
  }
  io.to(room).emit("room:userlist", { room, users });
}

const registerUserHandlers = (io, socket) => {
  socket.on("user:login", ({ username, avatar }) => {
    connectedUsers.set(socket.id, {
      username,
      avatar,
      currentRoom: null,
    });
  });

  socket.on("room:join", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;

    if (user.currentRoom && user.currentRoom !== room) {
      socket.leave(user.currentRoom);
      broadcastUserList(io, user.currentRoom);
    }

    socket.join(room);
    user.currentRoom = room;
    socket.emit("room:history", { room, messages: getHistory(room) });

    broadcastUserList(io, room);
  });

  socket.on("room:leave", ({ room }) => {
    if (!room) return;
    socket.leave(room);

    const user = connectedUsers.get(socket.id);
    if (user && user.currentRoom === room) {
      user.currentRoom = null;
    }
    broadcastUserList(io, room);
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    const room = user && user.currentRoom;
    connectedUsers.delete(socket.id);
    if (room) {
      broadcastUserList(io, room);
    }
  });
};

module.exports = { registerUserHandlers, connectedUsers };
