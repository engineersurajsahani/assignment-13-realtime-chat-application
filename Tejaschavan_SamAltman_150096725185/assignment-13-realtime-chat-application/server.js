// server.js
require('dotenv').config();
const http = require('http');
const path = require('path');
const express = require('express');
const cors = require('cors');
const { Server } = require('socket.io');

const { registerUserHandlers } = require('./sockets/userHandler');
const { registerChatHandlers } = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

const PORT = process.env.PORT || 5000;
const CORS_ORIGIN = process.env.CORS_ORIGIN || '*';

// Enable CORS and serve static files from public/
app.use(cors({ origin: CORS_ORIGIN }));
app.use(express.static(path.join(__dirname, 'public')));

// Configure Socket.io with configurable CORS
const io = new Server(server, {
  cors: {
    origin: CORS_ORIGIN,
    methods: ['GET', 'POST']
  }
});

// Wire socket handlers on connection
io.on('connection', (socket) => {
  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);
});

// Start the HTTP & WebSocket server with automatic fallback if port is in use (e.g. macOS AirPlay Receiver on 5000)
const initialPort = parseInt(process.env.PORT, 10) || 5000;

function startServer(port) {
  const onListening = () => {
    server.removeListener('error', onError);
    console.log(`=============================================`);
    console.log(`PulseChat Server running on http://localhost:${port}`);
    console.log(`Socket.io ready with CORS: ${CORS_ORIGIN}`);
    console.log(`=============================================`);
  };

  const onError = (err) => {
    server.removeListener('listening', onListening);
    if (err.code === 'EADDRINUSE') {
      console.warn(`Port ${port} is currently in use. Trying port ${port + 1}...`);
      startServer(port + 1);
    } else {
      console.error('Server error:', err);
    }
  };

  server.once('listening', onListening);
  server.once('error', onError);
  server.listen(port);
}

startServer(initialPort);



