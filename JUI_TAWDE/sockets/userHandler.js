function register(io, socket, state, publicRooms) {
  socket.on("user:login", (payload = {}) => {
    const username = String(payload.username || "").trim().slice(0, 24);
    if (!username) return socket.emit("app:error", { message: "Please enter a username." });

    const avatar = payload.avatar || `avatar-${(username.charCodeAt(0) % 6) + 1}`;
    const user = {
      id: socket.id,
      username,
      avatar,
      currentRoom: "general",
      connectedAt: new Date().toISOString()
    };

    state.connectedUsers.set(socket.id, user);
    state.userGroups.set(socket.id, state.userGroups.get(socket.id) || new Set());

    socket.join("general");
    socket.emit("user:ready", {
      user,
      publicRooms,
      onlineUsers: Array.from(state.connectedUsers.values())
    });

    io.emit("presence:update", {
      users: Array.from(state.connectedUsers.values())
    });

    io.to("general").emit("room:userlist", {
      room: "general",
      users: usersInRoom(io, state, "general")
    });
  });

  socket.on("user:presence", () => {
    io.emit("presence:update", { users: Array.from(state.connectedUsers.values()) });
  });
}

function usersInRoom(io, state, room) {
  const ids = io.sockets.adapter.rooms.get(room) || new Set();
  return [...ids]
    .map(id => state.connectedUsers.get(id))
    .filter(Boolean)
    .map(u => ({ id: u.id, username: u.username, avatar: u.avatar }));
}

module.exports = register;
module.exports.usersInRoom = usersInRoom;
