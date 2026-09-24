// Socket handler for user authentication, room join/leave and presence
const { getRoomHistory } = require("../utils/messageStore");

function getCurrentTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

module.exports = function (io, socket, connectedUsers) {

  // User login/registration
  socket.on("user:login", (data) => {
    const { username, avatar } = data;
    if (!username) return;

    const userObj = {
      socketId: socket.id,
      username: username.trim(),
      avatar: avatar || "👤",
      currentRoom: null
    };

    connectedUsers.set(socket.id, userObj);

    socket.emit("user:login_success", userObj);

    // Broadcast all online users to update DM lists
    const allUsers = Array.from(connectedUsers.values()).map((u) => ({
      socketId: u.socketId,
      username: u.username,
      avatar: u.avatar
    }));
    io.emit("users:online", allUsers);
  });

  // Join chat channel/room
  socket.on("room:join", (data) => {
    const { room } = data;
    if (!room) return;

    const user = connectedUsers.get(socket.id);
    if (!user) return;

    // Leave previous room if currently in one
    if (user.currentRoom && user.currentRoom !== room) {
      socket.leave(user.currentRoom);

      // Update userlist in old room
      const oldRoomUsers = Array.from(connectedUsers.values())
        .filter((u) => u.currentRoom === user.currentRoom && u.socketId !== socket.id)
        .map((u) => ({ socketId: u.socketId, username: u.username, avatar: u.avatar }));

      io.to(user.currentRoom).emit("room:userlist", {
        room: user.currentRoom,
        users: oldRoomUsers
      });
    }

    // Join new room
    socket.join(room);
    user.currentRoom = room;

    // 1. Send recent message history buffer to joined user
    socket.emit("room:history", {
      room: room,
      messages: getRoomHistory(room)
    });

    // 2. Broadcast updated userlist to everyone in the room
    const currentRoomUsers = Array.from(connectedUsers.values())
      .filter((u) => u.currentRoom === room)
      .map((u) => ({ socketId: u.socketId, username: u.username, avatar: u.avatar }));

    io.to(room).emit("room:userlist", {
      room: room,
      users: currentRoomUsers
    });

    // 3. System message
    socket.to(room).emit("chat:receive", {
      id: "sys_" + Date.now(),
      sender: "System",
      message: `${user.username} joined #${room}`,
      isSystem: true,
      timestamp: getCurrentTime()
    });
  });

  // Leave current room
  socket.on("room:leave", (data) => {
    const { room } = data;
    const user = connectedUsers.get(socket.id);
    if (!user || user.currentRoom !== room) return;

    socket.leave(room);
    user.currentRoom = null;

    const remainingUsers = Array.from(connectedUsers.values())
      .filter((u) => u.currentRoom === room)
      .map((u) => ({ socketId: u.socketId, username: u.username, avatar: u.avatar }));

    io.to(room).emit("room:userlist", {
      room: room,
      users: remainingUsers
    });
  });

  // User disconnect
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      if (user.currentRoom) {
        socket.to(user.currentRoom).emit("chat:receive", {
          id: "sys_" + Date.now(),
          sender: "System",
          message: `${user.username} left the chat`,
          isSystem: true,
          timestamp: getCurrentTime()
        });

        const remainingRoomUsers = Array.from(connectedUsers.values())
          .filter((u) => u.currentRoom === user.currentRoom && u.socketId !== socket.id)
          .map((u) => ({ socketId: u.socketId, username: u.username, avatar: u.avatar }));

        socket.to(user.currentRoom).emit("room:userlist", {
          room: user.currentRoom,
          users: remainingRoomUsers
        });
      }

      connectedUsers.delete(socket.id);

      // Update online users list for all
      const allUsers = Array.from(connectedUsers.values()).map((u) => ({
        socketId: u.socketId,
        username: u.username,
        avatar: u.avatar
      }));
      io.emit("users:online", allUsers);
    }
  });
};
