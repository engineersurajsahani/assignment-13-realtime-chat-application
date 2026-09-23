const express = require("express");
const http = require("http");
const path = require("path");
const cors = require("cors");
const { Server } = require("socket.io");

require("dotenv").config();

const connectDB = require("./config/db");
const { setupUserSocket } = require("./sockets/userHandler");
const { setupChatSocket } = require("./sockets/chatHandler");
const { roomHistories, DEFAULT_ROOMS, seedHistory } = require("./utils/messageStore");

const app = express();
const server = http.createServer(app);

const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
  },
  maxHttpBufferSize: 1e6,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public")));

const connectedUsers = new Map();

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    activeUsers: connectedUsers.size,
    activeRooms: DEFAULT_ROOMS.reduce((acc, room) => {
      acc[room] = roomHistories[room] ? roomHistories[room].length : 0;
      return acc;
    }, {}),
  });
});

const start = async () => {
  if (process.env.MONGO_URI) {
    const conn = await connectDB();
    if (conn) {
      console.log("Message persistence: MongoDB enabled");
    } else {
      console.warn("Message persistence: MongoDB unreachable — running in-memory only.");
    }
  } else {
    console.warn("Warning: MONGO_URI is not set — history kept in memory only.");
  }

  seedHistory();

  io.on("connection", (socket) => {
    console.log(`user:connect ${socket.id}`);

    setupUserSocket(io, socket, { connectedUsers });
    setupChatSocket(io, socket, { connectedUsers });
  });

  const PORT = process.env.PORT || 5000;
  server.listen(PORT, () => {
    console.log(`\nChat server running at http://localhost:${PORT}`);
    console.log(`Open multiple tabs at http://localhost:${PORT} to test rooms, typing & DMs\n`);
  });
};

start().catch((error) => {
  console.error("Failed to start server:", error);
  process.exit(1);
});