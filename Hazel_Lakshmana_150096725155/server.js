require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");

const registerUserHandlers = require("./sockets/userHandler");
const registerChatHandlers = require("./sockets/chatHandler");

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static("public"));

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const connectedUsers = new Map();

io.on("connection", (socket) => {
  registerUserHandlers(io, socket, connectedUsers);
  registerChatHandlers(io, socket, connectedUsers);

  socket.on("disconnect", () => {
    connectedUsers.delete(socket.id);
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`Chat server running at http://localhost:${PORT}`);
});