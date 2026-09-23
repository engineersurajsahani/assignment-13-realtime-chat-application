const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const registerUserHandlers = require('./sockets/userHandler');
const registerChatHandlers = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

const connectedUsers = new Map();

io.on('connection', (socket) => {
  console.log('[Socket Connected] ID: ' + socket.id);

  registerUserHandlers(io, socket, connectedUsers);
  registerChatHandlers(io, socket, connectedUsers);

  socket.on('disconnect', () => {
    console.log('[Socket Disconnected] ID: ' + socket.id);
  });
});

const PORT = process.env.PORT || 5001;
server.listen(PORT, '0.0.0.0', () => {
  console.log('Chat Engine running on port ' + PORT);
});