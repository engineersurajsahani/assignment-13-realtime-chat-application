require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const { Server } = require('socket.io');
const cors = require('cors');

const chatHandler = require('./sockets/chatHandler');
const userHandler = require('./sockets/userHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const PORT = process.env.PORT || 5000;

// In-Memory Global User Session Map
// socketId -> { socketId, username, avatar, currentRoom }
const connectedUsers = new Map();

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

// Socket Connection Router
io.on('connection', (socket) => {
  console.log(`💬 Chat Client Connected: ${socket.id}`);

  userHandler(io, socket, connectedUsers);
  chatHandler(io, socket, connectedUsers);

  socket.on('disconnect', () => {
    console.log(`❌ Chat Client Disconnected: ${socket.id}`);
  });
});

server.listen(PORT, () => {
  console.log(`💬 Real-Time Chat Server running at http://localhost:${PORT}`);
});
