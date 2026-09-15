/**
 * Real-Time Group Chat & Messaging Backend Engine (Socket.io & REST APIs)
 * Student: Prince Yadav (150096725032)
 * Track: Backend & Real-Time Web | Assignment 13
 */

require('dotenv').config();
const http = require('http');
const express = require('express');
const { Server } = require('socket.io');
const cors = require('cors');

const registerUserHandlers = require('./sockets/userHandler');
const registerChatHandlers = require('./sockets/chatHandler');
const { getAllUsers, getAvailableRooms } = require('./utils/messageStore');

const roomRoutesFactory = require('./routes/roomRoutes');
const userRoutesFactory = require('./routes/userRoutes');

const app = express();
const server = http.createServer(app);

// Middleware
app.use(cors());
app.use(express.json());

// Setup Socket.io with CORS
const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

// Root API Welcome & Endpoint Index
app.get('/', (req, res) => {
  res.json({
    message: 'Welcome to Assignment 13: Real-Time Group Chat & Messaging Backend Engine',
    student: 'Prince Yadav (150096725032)',
    documentation: 'See README.md for full Socket.io event protocol and REST API guide',
    endpoints: {
      health: 'GET /health',
      rooms: {
        list: 'GET /api/rooms',
        create: 'POST /api/rooms',
        messages: 'GET /api/rooms/:room/messages',
        sendMessage: 'POST /api/rooms/:room/messages',
        activeUsers: 'GET /api/rooms/:room/users',
        clearMessages: 'DELETE /api/rooms/:room/messages'
      },
      users: {
        allOnline: 'GET /api/users',
        userById: 'GET /api/users/:socketId',
        sendDirectMessage: 'POST /api/users/messages/direct'
      }
    }
  });
});

// Server & Room Health API
app.get('/health', (req, res) => {
  res.json({
    status: 'online',
    timestamp: new Date().toISOString(),
    engine: 'Socket.io 4.x & Express Backend',
    student: 'Prince Yadav (150096725032)',
    stats: {
      connectedSocketsCount: getAllUsers().length,
      availableRooms: getAvailableRooms()
    }
  });
});

// Mount Modular REST API Routes (with io passed for real-time dispatch)
app.use('/api/rooms', roomRoutesFactory(io));
app.use('/api/users', userRoutesFactory(io));

// Register socket event handlers per client connection
io.on('connection', (socket) => {
  console.log(`[SOCKET CONNECTED] Socket ID: ${socket.id}`);

  // Register modular socket event handlers
  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

const DEFAULT_PORT = parseInt(process.env.PORT, 10) || 5000;

function startServer(portToUse) {
  const onError = (err) => {
    if (err.code === 'EADDRINUSE') {
      console.warn(`⚠️ Port ${portToUse} is in use (often macOS AirPlay on port 5000).`);
      const nextPort = portToUse === 5000 ? 5050 : portToUse + 1;
      console.log(`🔄 Retrying backend startup on fallback port ${nextPort}...`);
      server.removeListener('listening', onListening);
      startServer(nextPort);
    } else {
      console.error('Server startup error:', err);
    }
  };

  const onListening = () => {
    server.removeListener('error', onError);
    const actualPort = server.address().port;
    console.log('====================================================');
    console.log(`🚀 Assignment 13 Real-Time Chat Backend running!`);
    console.log(`👤 Student: Prince Yadav (150096725032)`);
    console.log(`🌐 Base URL: http://localhost:${actualPort}`);
    console.log(`🩺 Health API: http://localhost:${actualPort}/health`);
    console.log(`📚 API Index:  http://localhost:${actualPort}/`);
    console.log('====================================================');
  };

  server.once('error', onError);
  server.once('listening', onListening);
  server.listen(portToUse);
}

if (require.main === module || (module.parent && module.parent.filename.endsWith('server.js'))) {
  startServer(DEFAULT_PORT);
}

module.exports = { app, server, io, startServer };
