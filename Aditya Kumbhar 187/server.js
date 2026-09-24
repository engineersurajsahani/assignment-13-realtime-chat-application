require("dotenv").config();
const http = require("http");
const express = require("express");
const cors = require("cors");
const { Server } = require("socket.io");

const userHandler = require("./sockets/userHandler");
const chatHandler = require("./sockets/chatHandler");

const app = express();
const server = http.createServer(app);

// Socket.io initialization
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static("public"));

// In-Memory User State Map: socketId -> { socketId, username, avatar, currentRoom }
const connectedUsers = new Map();

// Socket Connection Handler
io.on("connection", (socket) => {
  console.log(`New socket connected: ${socket.id}`);

  // Register Handlers
  userHandler(io, socket, connectedUsers);
  chatHandler(io, socket, connectedUsers);
});

// Health check endpoint
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    onlineUsers: connectedUsers.size,
    timestamp: new Date().toISOString()
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`Chat Server running on http://localhost:${PORT}`);
});
