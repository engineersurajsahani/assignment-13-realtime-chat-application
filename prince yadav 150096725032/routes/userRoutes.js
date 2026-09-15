/**
 * User Presence & Direct Messaging REST API Routes
 * Student: Prince Yadav (150096725032)
 */

const express = require('express');
const router = express.Router();
const {
  getAllUsers,
  getUser,
  getUserByUsername
} = require('../utils/messageStore');

module.exports = function (io) {
  // GET /api/users - List all online users across all rooms
  router.get('/', (req, res) => {
    try {
      const users = getAllUsers();
      res.status(200).json({
        success: true,
        count: users.length,
        users
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // GET /api/users/:socketId - Retrieve specific user session
  router.get('/:socketId', (req, res) => {
    try {
      const user = getUser(req.params.socketId);
      if (!user) {
        return res.status(404).json({ success: false, message: 'User socket session not found.' });
      }
      res.status(200).json({
        success: true,
        user
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  // POST /api/messages/direct - Send a direct message to a recipient socket ID via REST
  router.post('/messages/direct', (req, res) => {
    try {
      const { recipientId, senderName, message, avatar } = req.body;

      if (!recipientId || !message) {
        return res.status(400).json({
          success: false,
          message: 'Both "recipientId" and "message" are required.'
        });
      }

      const recipient = getUser(recipientId);
      if (!recipient) {
        return res.status(404).json({
          success: false,
          message: 'Target recipient socket is offline or does not exist.'
        });
      }

      const hours = String(new Date().getHours()).padStart(2, '0');
      const minutes = String(new Date().getMinutes()).padStart(2, '0');

      const dmObj = {
        id: `dm_api_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`,
        from: senderName || 'REST-API',
        fromId: 'REST_CLIENT',
        avatar: avatar || 'avatar1.png',
        message: message.trim(),
        timestamp: `${hours}:${minutes}`,
        viaRest: true
      };

      // Deliver to recipient socket
      if (io) {
        io.to(recipientId).emit('direct:receive', dmObj);
      }

      res.status(200).json({
        success: true,
        message: 'Direct message dispatched successfully to recipient socket.',
        data: dmObj
      });
    } catch (err) {
      res.status(500).json({ success: false, message: err.message });
    }
  });

  return router;
};
