/**
 * Room & Channel REST API Routes
 * Student: Pratik Swain (150096725184)
 */

const express = require('express');
const router = express.Router();
const {
  getRoomsWithStats,
  createRoom,
  getRoomHistory,
  clearRoomHistory,
  getUsersInRoom,
  getRoomUsernames,
  addMessageToHistory
} = require('../utils/messageStore');

module.exports = function (io) {
  // GET /api/rooms - List all rooms with active stats
  router.get('/', (req, res) => {
    try {
      const rooms = getRoomsWithStats();
      res.status(200).json({
        success: true,
        count: rooms.length,
        rooms
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/rooms - Create a new channel
  router.post('/', (req, res) => {
    try {
      const { room } = req.body;
      if (!room || typeof room !== 'string') {
        return res.status(400).json({ success: false, message: 'Field "room" is required.' });
      }

      const cleanRoom = createRoom(room);
      if (io) {
        io.emit('room:list', { rooms: require('../utils/messageStore').getAvailableRooms() });
      }

      res.status(201).json({
        success: true,
        message: `Channel #${cleanRoom} created successfully.`,
        room: cleanRoom
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /api/rooms/:room/messages - Get recent message history (max 50)
  router.get('/:room/messages', (req, res) => {
    try {
      const room = req.params.room.toLowerCase();
      const messages = getRoomHistory(room);
      res.status(200).json({
        success: true,
        room,
        count: messages.length,
        messages
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/rooms/:room/messages - Dispatch a message via REST & broadcast via Socket.io
  router.post('/:room/messages', (req, res) => {
    try {
      const room = req.params.room.toLowerCase();
      const { sender, message, avatar } = req.body;

      if (!message || typeof message !== 'string') {
        return res.status(400).json({ success: false, message: 'Field "message" is required.' });
      }

      const hours = String(new Date().getHours()).padStart(2, '0');
      const minutes = String(new Date().getMinutes()).padStart(2, '0');

      const messageObj = {
        id: `msg_api_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        sender: sender || 'REST-API',
        avatar: avatar || 'avatar1.png',
        message: message.trim(),
        timestamp: `${hours}:${minutes}`,
        room,
        viaRest: true
      };

      // Add to in-memory buffer
      addMessageToHistory(room, messageObj);

      // Broadcast to all socket listeners in the room
      if (io) {
        io.to(room).emit('chat:receive', messageObj);
      }

      res.status(201).json({
        success: true,
        data: messageObj
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /api/rooms/:room/users - Get active online users in a room
  router.get('/:room/users', (req, res) => {
    try {
      const room = req.params.room.toLowerCase();
      const users = getUsersInRoom(room);
      const usernames = getRoomUsernames(room);

      res.status(200).json({
        success: true,
        room,
        count: users.length,
        usernames,
        users
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // DELETE /api/rooms/:room/messages - Clear history
  router.delete('/:room/messages', (req, res) => {
    try {
      const room = req.params.room.toLowerCase();
      const cleared = clearRoomHistory(room);
      res.status(200).json({
        success: cleared,
        message: cleared ? `Message history cleared for #${room}.` : `Room #${room} not found.`
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
