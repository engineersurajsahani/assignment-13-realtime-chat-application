const { addToHistory, getHistory } = require("../utils/messageStore");
const { usersInRoom } = require("./userHandler");

function register(io, socket, state, publicRooms) {
  socket.on("room:join", ({ room } = {}) => {
    const user = state.connectedUsers.get(socket.id);
    room = String(room || "").replace(/^#/, "").trim().toLowerCase();

    if (!user) return socket.emit("app:error", { message: "Login is required first." });
    if (!publicRooms.includes(room)) {
      return socket.emit("app:error", { message: "That public channel does not exist." });
    }

    const oldRoom = user.currentRoom;
    if (oldRoom && oldRoom !== room) {
      socket.leave(oldRoom);
      io.to(oldRoom).emit("room:userlist", {
        room: oldRoom,
        users: usersInRoom(io, state, oldRoom)
      });
    }

    user.currentRoom = room;
    socket.join(room);

    socket.emit("room:history", { room, messages: getHistory(state.roomHistories, room) });
    io.to(room).emit("room:userlist", {
      room,
      users: usersInRoom(io, state, room)
    });
  });

  socket.on("room:leave", ({ room } = {}) => {
    room = String(room || "").replace(/^#/, "");
    socket.leave(room);
    const user = state.connectedUsers.get(socket.id);
    if (user && user.currentRoom === room) user.currentRoom = null;

    io.to(room).emit("room:userlist", {
      room,
      users: usersInRoom(io, state, room)
    });
  });
}

module.exports = register;
