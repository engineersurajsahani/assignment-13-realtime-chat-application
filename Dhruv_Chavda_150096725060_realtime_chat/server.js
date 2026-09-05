const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const dotenv = require('dotenv');
const { Server } = require('socket.io');

const registerUserHandlers = require('./sockets/userHandler');
const registerChatHandlers = require('./sockets/chatHandler');

// Load environment configuration
dotenv.config();

const app = express();
const server = http.createServer(app);

// Configure Socket.io with permissive CORS for testing
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

app.use(cors());
app.use(express.json());

// Serve static frontend assets
app.use(express.static(path.join(__dirname, 'public')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.status(200).json({
    success: true,
    message: '💬 Real-Time Group Chat & Messaging Engine is operational',
    version: '1.0.0'
  });
});

// Socket connection pipeline
io.on('connection', (socket) => {
  console.log(`⚡ Client connected: ${socket.id}`);

  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

const PORT = process.env.PORT || 5000;

server.listen(PORT, () => {
  console.log(`🚀 Real-Time Chat Server running at http://localhost:${PORT}`);
});

module.exports = { app, server, io };
