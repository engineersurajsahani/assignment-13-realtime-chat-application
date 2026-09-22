const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");
const { registerUserHandlers } = require("./sockets/userHandler");
const { registerChatHandlers } = require("./sockets/chatHandler");

const app = express();
app.use(cors());
app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: { origin: "*" },
});

io.on("connection", (socket) => {
  console.log(`Socket connected: ${socket.id}`);

  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

const PORT = 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
