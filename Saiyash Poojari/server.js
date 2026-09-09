require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const cors = require('cors');
const { Server } = require('socket.io');

const { registerUserHandlers } = require('./sockets/userHandler');
const { registerChatHandlers } = require('./sockets/chatHandler');

const app = express();
const server = http.createServer(app);

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(express.static(path.join(__dirname, 'public')));

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'Real-Time Group Chat Engine', timestamp: new Date() });
});

const io = new Server(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST']
  }
});

io.on('connection', (socket) => {
  console.log(`[Socket] New connection established: ${socket.id}`);

  registerUserHandlers(io, socket);
  registerChatHandlers(io, socket);

  socket.on('error', (err) => {
    console.error(`[Socket Error] ${socket.id}:`, err);
  });
});

const PORT = process.env.PORT || 5001;

server.listen(PORT, () => {
  console.log(`=================================================`);
  console.log(`Real-Time Chat Engine running on port ${PORT}`);
  console.log(`Local UI URL: http://localhost:${PORT}`);
  console.log(`=================================================`);
});
