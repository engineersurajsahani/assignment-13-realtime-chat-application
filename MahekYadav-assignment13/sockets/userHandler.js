const { getRoomHistory } = require("../utils/messageStore");

function getRoomUsers(io, connectedUsers, room) {
  const users = [];

  for (const [socketId, user] of connectedUsers.entries()) {
    if (user.currentRoom === room) {
      users.push(user.username);
    }
  }

  return users;
}

function broadcastRoomUsers(io, connectedUsers, room) {
  io.to(room).emit("room:userlist", {
    room,
    users: getRoomUsers(io, connectedUsers, room)
  });
}

function registerUserHandlers(io, socket, connectedUsers) {
  socket.on("user:login", ({ username, avatar }) => {
    const cleanUsername = String(username || "").trim();

    if (!cleanUsername) {
      socket.emit("error", { message: "Username is required." });
      return;
    }

    connectedUsers.set(socket.id, {
      username: cleanUsername,
      avatar: avatar || "avatar1.png",
      currentRoom: null
    });

    socket.emit("user:loggedin", {
      socketId: socket.id,
      username: cleanUsername
    });
  });

  socket.on("room:join", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    const cleanRoom = String(room || "").trim().toLowerCase();

    if (!user || !cleanRoom) return;

    if (user.currentRoom && user.currentRoom !== cleanRoom) {
      const oldRoom = user.currentRoom;
      socket.leave(oldRoom);
      broadcastRoomUsers(io, connectedUsers, oldRoom);
    }

    socket.join(cleanRoom);
    user.currentRoom = cleanRoom;

    socket.emit("room:history", {
      room: cleanRoom,
      messages: getRoomHistory(cleanRoom)
    });

    broadcastRoomUsers(io, connectedUsers, cleanRoom);
  });

  socket.on("room:leave", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    const cleanRoom = String(room || "").trim().toLowerCase();

    if (!user || !cleanRoom) return;

    socket.leave(cleanRoom);

    if (user.currentRoom === cleanRoom) {
      user.currentRoom = null;
    }

    broadcastRoomUsers(io, connectedUsers, cleanRoom);
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);

    if (user && user.currentRoom) {
      const room = user.currentRoom;
      connectedUsers.delete(socket.id);
      broadcastRoomUsers(io, connectedUsers, room);
    }
  });
}

module.exports = registerUserHandlers;