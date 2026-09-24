const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const cors = require("cors");
const path = require("path");
require("dotenv").config();

const { registerUserHandlers } = require("./sockets/userHandler");
const { registerChatHandlers } = require("./sockets/chatHandler");

const app = express();
const server = http.createServer(app);

// CORS configuration
app.use(cors({ origin: "*" }));

// Serve static assets from the public directory
app.use(express.static(path.join(__dirname, "public")));

// Initialize Socket.io with permissive CORS
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Setup socket connection listeners
io.on("connection", (socket) => {
  // Register modular handlers for users, rooms, and chat
  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

// Fallback route for SPA
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

const PORT = process.env.PORT || 5000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  console.log(`Open http://localhost:${PORT} in your browser`);
});
