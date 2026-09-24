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

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Socket.io initialization with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Socket connection bootstrapping
io.on('connection', (socket) => {
  console.log(`[Socket Connected] Socket ID: ${socket.id}`);

  // Register socket modular handlers
  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

// REST API Health Check Endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    service: 'Real-Time Group Chat & Messaging Engine',
    timestamp: new Date().toISOString()
  });
});

// Fallback to index.html for SPA routing if needed
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

const DEFAULT_PORT = parseInt(process.env.PORT || '5000', 10);

function startServer(port) {
  const currentServer = server.listen(port, () => {
    console.log(`==============================================`);
    console.log(`🚀 Chat Server running on http://localhost:${port}`);
    console.log(`==============================================`);
  });

  currentServer.on('error', (err) => {
    if (err.code === 'EADDRINUSE') {
      console.log(`⚠️ Port ${port} is occupied. Attempting port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  });
}

startServer(DEFAULT_PORT);
