const connectedUsers = new Map();

function setupUserHandlers(io, socket) {
  socket.on("user:login", (data) => {
    const { username, avatar } = data;

    if (!username) {
      socket.emit("error", {
        message: "Username is required"
      });
      return;
    }

    connectedUsers.set(socket.id, {
      username,
      avatar: avatar || null,
      currentRoom: null
    });

    socket.emit("user:loggedin", {
      socketId: socket.id,
      username
    });

    console.log(`${username} connected with socket ${socket.id}`);
  });

  socket.on("room:join", (data) => {
    const { room } = data;

    if (!room) return;

    const user = connectedUsers.get(socket.id);

    if (!user) {
      socket.emit("error", {
        message: "Please login first"
      });
      return;
    }

    if (user.currentRoom) {
      socket.leave(user.currentRoom);
    }

    socket.join(room);

    user.currentRoom = room;
    connectedUsers.set(socket.id, user);

    updateRoomUsers(io, room);
  });

  socket.on("room:leave", (data) => {
    const { room } = data;

    if (!room) return;

    socket.leave(room);

    const user = connectedUsers.get(socket.id);

    if (user) {
      user.currentRoom = null;
      connectedUsers.set(socket.id, user);
    }

    updateRoomUsers(io, room);
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);

    if (user && user.currentRoom) {
      const room = user.currentRoom;

      connectedUsers.delete(socket.id);

      updateRoomUsers(io, room);
    } else {
      connectedUsers.delete(socket.id);
    }

    console.log(`Socket disconnected: ${socket.id}`);
  });
}

function updateRoomUsers(io, room) {
  const users = [];

  for (const user of connectedUsers.values()) {
    if (user.currentRoom === room) {
      users.push(user.username);
    }
  }

  io.to(room).emit("room:userlist", {
    room,
    users
  });
}

module.exports = {
  connectedUsers,
  setupUserHandlers,
  updateRoomUsers
};