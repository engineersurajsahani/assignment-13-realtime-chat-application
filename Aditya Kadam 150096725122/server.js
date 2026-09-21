require('dotenv').config();
const express = require('express');
const { createServer } = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');

const app = express();
const httpServer = createServer(app);

const io = new Server(httpServer, {
  cors: {
    origin: process.env.CORS_ORIGIN || '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.static(path.join(__dirname, 'public')));

const messageStore = require('./utils/messageStore');
const userHandler = require('./sockets/userHandler');
const chatHandler = require('./sockets/chatHandler');

io.on('connection', (socket) => {
  console.log(`User connected: ${socket.id}`);

  socket.on('user:login', (data) => {
    userHandler.handleLogin(socket, io, data);
  });

  socket.on('room:join', (data) => {
    userHandler.handleJoinRoom(socket, io, messageStore, data);
  });

  socket.on('room:leave', (data) => {
    userHandler.handleLeaveRoom(socket, io, messageStore);
    if (data && data.room) {
      socket.emit('room:left', { room: data.room });
    }
  });

  socket.on('chat:send', (data) => {
    chatHandler.handleSendMessage(socket, io, messageStore, data);
  });

  socket.on('typing:start', (data) => {
    chatHandler.handleTypingStart(socket, io, data);
  });

  socket.on('typing:stop', (data) => {
    chatHandler.handleTypingStop(socket, io, data);
  });

  socket.on('direct:send', (data) => {
    chatHandler.handleDirectMessage(socket, io, data);
  });

  socket.on('disconnect', () => {
    console.log(`User disconnected: ${socket.id}`);
    userHandler.handleDisconnect(socket, io, messageStore);
  });
});

const PORT = process.env.PORT || 3000;
httpServer.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
