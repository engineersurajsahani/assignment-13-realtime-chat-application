require("dotenv").config();

const path = require("path");
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const registerUserHandlers = require("./sockets/userHandler");
const registerRoomHandlers = require("./sockets/roomHandler");
const registerChatHandlers = require("./sockets/chatHandler");
const registerDirectHandlers = require("./sockets/directHandler");
const registerGroupHandlers = require("./sockets/groupHandler");

const app = express();
const server = http.createServer(app);

const allowedOrigin = process.env.CLIENT_ORIGIN || "*";

app.use(cors({ origin: allowedOrigin }));
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const io = new Server(server, {
  cors: { origin: allowedOrigin, methods: ["GET", "POST"] }
});

const state = {
  connectedUsers: new Map(),
  roomHistories: new Map(),
  dmHistories: new Map(),
  groups: new Map(),
  userGroups: new Map()
};

const publicRooms = ["general", "developers", "gaming", "random"];
publicRooms.forEach(room => state.roomHistories.set(room, []));

io.on("connection", socket => {
  socket.data.typingTimers = new Map();

  registerUserHandlers(io, socket, state, publicRooms);
  registerRoomHandlers(io, socket, state, publicRooms);
  registerChatHandlers(io, socket, state, publicRooms);
  registerDirectHandlers(io, socket, state);
  registerGroupHandlers(io, socket, state);

  socket.on("disconnect", reason => {
    const user = state.connectedUsers.get(socket.id);
    if (user) {
      socket.rooms.forEach(room => {
        if (room !== socket.id) {
          socket.to(room).emit("typing:update", {
            username: user.username,
            isTyping: false
          });
        }
      });
      state.connectedUsers.delete(socket.id);
    }
  });
});

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "realtime-chat", users: state.connectedUsers.size });
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`✦ PHX Chat running at http://localhost:${PORT}`);
});
