

const { getHistory } = require("../utils/messageStore");

const connectedUsers = new Map();

function getUsersInRoom(io, room) {
  const roomSockets = io.sockets.adapter.rooms.get(room);
  if (!roomSockets) return [];

  const users = [];
  roomSockets.forEach((socketId) => {
    const user = connectedUsers.get(socketId);
    if (user) users.push(user.username);
  });
  return users;
}

function broadcastRoomUserList(io, room) {
  io.to(room).emit("room:userlist", {
    room,
    users: getUsersInRoom(io, room)
  });
}

function registerUserHandlers(io, socket) {

  socket.on("user:login", ({ username, avatar }) => {
    if (!username || typeof username !== "string") {
      socket.emit("error:message", { message: "A valid username is required." });
      return;
    }

    connectedUsers.set(socket.id, {
      username: username.trim(),
      avatar: avatar || "avatar1.png",
      currentRoom: null
    });

    socket.emit("user:loggedIn", {
      id: socket.id,
      username: username.trim(),
      avatar: avatar || "avatar1.png"
    });
  });


  socket.on("room:join", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user) {
      socket.emit("error:message", { message: "Please log in before joining a room." });
      return;
    }
    if (!room || typeof room !== "string") {
      socket.emit("error:message", { message: "A valid room name is required." });
      return;
    }


    if (user.currentRoom && user.currentRoom !== room) {
      socket.leave(user.currentRoom);
      broadcastRoomUserList(io, user.currentRoom);
      socket.to(user.currentRoom).emit("room:systemMessage", {
        room: user.currentRoom,
        text: `${user.username} left the room.`
      });
    }

    socket.join(room);
    user.currentRoom = room;
    connectedUsers.set(socket.id, user);


    socket.emit("room:history", {
      room,
      messages: getHistory(room)
    });


    socket.to(room).emit("room:systemMessage", {
      room,
      text: `${user.username} joined the room.`
    });
    broadcastRoomUserList(io, room);
  });


  socket.on("room:leave", ({ room }) => {
    const user = connectedUsers.get(socket.id);
    if (!user || !room) return;

    socket.leave(room);
    if (user.currentRoom === room) {
      user.currentRoom = null;
      connectedUsers.set(socket.id, user);
    }

    socket.to(room).emit("room:systemMessage", {
      room,
      text: `${user.username} left the room.`
    });
    broadcastRoomUserList(io, room);
  });


  socket.on("disconnect", () => {
    const user = connectedUsers.get(socket.id);
    if (user) {
      if (user.currentRoom) {
        socket.to(user.currentRoom).emit("room:systemMessage", {
          room: user.currentRoom,
          text: `${user.username} disconnected.`
        });
        connectedUsers.delete(socket.id);
        broadcastRoomUserList(io, user.currentRoom);
      } else {
        connectedUsers.delete(socket.id);
      }
    }
  });
}

module.exports = {
  registerUserHandlers,
  connectedUsers,
  getUsersInRoom,
  broadcastRoomUserList
};
