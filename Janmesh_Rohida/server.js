const path = require('path');
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');
require('dotenv').config();

const handleUserEvents = require('./sockets/userHandler');
const handleChatEvents = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io Connection Logic
io.on('connection', (socket) => {
  console.log(`[Socket Connected] ID: ${socket.id}`);

  // Attach event handlers
  handleUserEvents(io, socket);
  handleChatEvents(io, socket);
});

// Port binding for local & Render deployment
const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(port) {
  server.listen(port, () => {
    console.log(`==========================================`);
    console.log(`🚀 Real-Time Chat Server running on port ${port}`);
    console.log(`👉 Access URL: http://localhost:${port}`);
    console.log(`==========================================`);
  }).on('error', (err) => {
    if (err.code === 'EADDRINUSE' && !process.env.PORT) {
      console.warn(`[Port ${port} in use] Trying fallback port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server listen error:', err);
    }
  });
}

startServer(DEFAULT_PORT);

