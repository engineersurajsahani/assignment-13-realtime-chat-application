require("dotenv").config();

const express = require("express");
const http = require("http");
const cors = require("cors");
const path = require("path");

const { Server } = require("socket.io");

const {
  setupUserHandlers
} = require("./sockets/userHandler");

const {
  setupChatHandlers
} = require("./sockets/chatHandler");

const app = express();

const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 5050;

// Middleware
app.use(cors());
app.use(express.json());

// Serve frontend
app.use(express.static(path.join(__dirname, "public")));

// Health check
app.get("/api", (req, res) => {
  res.json({
    message: "Real-Time Chat Server is running"
  });
});

// Socket.io connection
io.on("connection", (socket) => {
  console.log(`New socket connected: ${socket.id}`);

  setupUserHandlers(io, socket);
  setupChatHandlers(io, socket);
});

// Start server
server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});