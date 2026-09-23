const { DEFAULT_ROOMS, getRoomHistory } = require("../utils/messageStore");

const MAX_USERNAME = 24;
const MAX_ROOM_NAME = 30;

const sanitizeUsername = (raw) => (raw || "").toString().trim().slice(0, MAX_USERNAME);

const sanitizeRoom = (raw) => {
  const room = (raw || "").toString().trim();
  if (!room) return null;
  return room.slice(0, MAX_ROOM_NAME).toLowerCase().replace(/\s+/g, "-");
};

const getRoomUsers = (connectedUsers, room) =>
  Array.from(connectedUsers.values())
    .filter((u) => u.currentRoom === room)
    .map((u) => ({ socketId: u.socketId, username: u.username, avatar: u.avatar }));

const setupUserSocket = (io, socket, state) => {
  const { connectedUsers } = state;

  const broadcastUserList = (room) => {
    io.to(room).emit("room:userlist", {
      room,
      users: getRoomUsers(connectedUsers, room),
    });
  };

  const joinRoom = async (room) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;

    if (user.currentRoom === room) return;

    if (user.currentRoom && socket.rooms.has(user.currentRoom)) {
      const prevRoom = user.currentRoom;
      socket.leave(prevRoom);
      broadcastUserList(prevRoom);
      socket.to(prevRoom).emit("room:system", {
        room: prevRoom,
        type: "leave",
        username: user.username,
        text: `${user.username} left ${prevRoom}`,
      });
    }

    socket.join(room);
    user.currentRoom = room;

    const messages = await getRoomHistory(room);
    socket.emit("room:history", { room, messages });

    broadcastUserList(room);
    socket.to(room).emit("room:system", {
      room,
      type: "join",
      username: user.username,
      text: `${user.username} joined ${room}`,
    });
  };

  const leaveRoom = (room) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;
    if (user.currentRoom !== room) return;

    socket.leave(room);
    user.currentRoom = null;

    broadcastUserList(room);
    socket.to(room).emit("room:system", {
      room,
      type: "leave",
      username: user.username,
      text: `${user.username} left ${room}`,
    });
  };

  socket.on("user:login", (payload) => {
    const username = sanitizeUsername(payload && payload.username);
    if (!username) {
      socket.emit("error", { message: "Username is required" });
      return;
    }

    connectedUsers.set(socket.id, {
      socketId: socket.id,
      username,
      avatar: (payload && payload.avatar) || null,
      currentRoom: null,
    });

    const user = connectedUsers.get(socket.id);
    socket.emit("user:loggedin", {
      socketId: socket.id,
      username: user.username,
      avatar: user.avatar,
      rooms: DEFAULT_ROOMS,
    });

    joinRoom("general");
  });

  socket.on("room:join", ({ room }) => {
    joinRoom(sanitizeRoom(room));
  });

  socket.on("room:leave", ({ room }) => {
    leaveRoom(sanitizeRoom(room));
  });

  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (!user) return;

    connectedUsers.delete(socket.id);

    const room = user.currentRoom;
    if (room) {
      socket.leave(room);
      broadcastUserList(room);
      socket.to(room).emit("room:system", {
        room,
        type: "leave",
        username: user.username,
        text: `${user.username} left ${room}`,
      });
      io.to(room).emit("typing:update", { username: user.username, isTyping: false });
    }
  });
};

module.exports = { setupUserSocket, sanitizeRoom, getRoomUsers };