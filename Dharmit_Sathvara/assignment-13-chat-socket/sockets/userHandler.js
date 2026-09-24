const { connectedUsers, getHistory } = require("../utils/messageStore");

/**
 * Register user & session management socket event handlers
 * @param {import("socket.io").Server} io
 * @param {import("socket.io").Socket} socket
 */
function registerUserHandlers(io, socket) {
  // 1. User Login: register identity and store in connectedUsers map
  socket.on("user:login", ({ username, avatar }, ack) => {
    if (!username || !username.trim()) return;
    const cleanUsername = username.trim();
    const cleanAvatar = avatar || "👤";

    connectedUsers.set(socket.id, {
      username: cleanUsername,
      avatar: cleanAvatar,
      currentRoom: null
    });

    if (typeof ack === "function") {
      ack({ success: true, socketId: socket.id, username: cleanUsername, avatar: cleanAvatar });
    }

    // Broadcast full online user roster for global DM roster
    io.emit(
      "users:online",
      Array.from(connectedUsers.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        avatar: u.avatar,
        currentRoom: u.currentRoom
      }))
    );
  });

  // 2. Room Join: leave old room, join new room, send history, update userlists
  socket.on("room:join", ({ room }) => {
    if (!room) return;
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    const oldRoom = user.currentRoom;

    // Leave old room if previously in one
    if (oldRoom && oldRoom !== room) {
      socket.leave(oldRoom);

      // Broadcast updated userlist to the old room
      const oldRoomUsers = Array.from(connectedUsers.entries())
        .filter(([id, u]) => id !== socket.id && u.currentRoom === oldRoom)
        .map(([id, u]) => ({ username: u.username, avatar: u.avatar, socketId: id }));

      io.to(oldRoom).emit("room:userlist", { room: oldRoom, users: oldRoomUsers });
    }

    // Join new room
    socket.join(room);
    user.currentRoom = room;

    // Emit message history exclusively to the joining socket
    socket.emit("room:history", {
      room,
      messages: getHistory(room)
    });

    // Compute room's current users & broadcast to the WHOLE room
    const currentRoomUsers = Array.from(connectedUsers.entries())
      .filter(([_, u]) => u.currentRoom === room)
      .map(([id, u]) => ({ username: u.username, avatar: u.avatar, socketId: id }));

    io.to(room).emit("room:userlist", {
      room,
      users: currentRoomUsers
    });

    // Update global online directory
    io.emit(
      "users:online",
      Array.from(connectedUsers.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        avatar: u.avatar,
        currentRoom: u.currentRoom
      }))
    );
  });

  // 3. Room Leave: leave room, clear user's currentRoom, update userlist
  socket.on("room:leave", ({ room }) => {
    if (!room) return;
    const user = connectedUsers.get(socket.id);
    socket.leave(room);

    if (user) {
      user.currentRoom = null;
    }

    const remainingUsers = Array.from(connectedUsers.entries())
      .filter(([_, u]) => u.currentRoom === room)
      .map(([id, u]) => ({ username: u.username, avatar: u.avatar, socketId: id }));

    io.to(room).emit("room:userlist", { room, users: remainingUsers });

    io.emit(
      "users:online",
      Array.from(connectedUsers.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        avatar: u.avatar,
        currentRoom: u.currentRoom
      }))
    );
  });

  // 4. Disconnect: clean up user, broadcast updated userlist to their room
  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    const lastRoom = user ? user.currentRoom : null;
    connectedUsers.delete(socket.id);

    if (lastRoom) {
      const remainingUsers = Array.from(connectedUsers.entries())
        .filter(([_, u]) => u.currentRoom === lastRoom)
        .map(([id, u]) => ({ username: u.username, avatar: u.avatar, socketId: id }));

      io.to(lastRoom).emit("room:userlist", { room: lastRoom, users: remainingUsers });
    }

    io.emit(
      "users:online",
      Array.from(connectedUsers.entries()).map(([id, u]) => ({
        socketId: id,
        username: u.username,
        avatar: u.avatar,
        currentRoom: u.currentRoom
      }))
    );
  });
}

module.exports = { registerUserHandlers };
