/**
 * Chat, Typing Indicators & Direct Messaging Handler
 * Student: Pratik Swain (150096725184)
 * Track: Backend & Real-Time Web | Assignment 13
 */

const {
  getUser,
  addMessageToHistory
} = require('../utils/messageStore');

function formatTime(date = new Date()) {
  const hours = String(date.getHours()).padStart(2, '0');
  const minutes = String(date.getMinutes()).padStart(2, '0');
  return `${hours}:${minutes}`;
}

module.exports = function registerChatHandlers(io, socket) {
  /**
   * chat:send - Client -> Server
   * Payload: { "room": "developers", "message": "Hey everyone!" }
   */
  socket.on('chat:send', (payload = {}) => {
    try {
      const room = (payload.room || '').trim().toLowerCase();
      const text = (payload.message || '').trim();

      if (!room || !text) {
        return socket.emit('error', { message: 'Room and message content are required.' });
      }

      const senderUser = getUser(socket.id);
      const sender = senderUser ? senderUser.username : `User_${socket.id.slice(0, 4)}`;
      const avatar = senderUser ? senderUser.avatar : 'avatar1.png';

      const messageObj = {
        id: `msg_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`,
        sender,
        avatar,
        message: text,
        timestamp: formatTime(),
        room,
        senderId: socket.id
      };

      // Store in memory buffer (max 50)
      addMessageToHistory(room, messageObj);

      // Broadcast to all participants in the room
      io.to(room).emit('chat:receive', messageObj);

      // Stop typing state immediately when message is sent
      socket.broadcast.to(room).emit('typing:update', {
        username: sender,
        isTyping: false,
        room
      });

      console.log(`[CHAT] [#${room}] ${sender}: ${text}`);
    } catch (err) {
      console.error('[CHAT SEND ERROR]', err);
      socket.emit('error', { message: 'Failed to dispatch chat message.' });
    }
  });

  /**
   * typing:start - Client -> Server
   * Payload: { "room": "developers" }
   */
  socket.on('typing:start', (payload = {}) => {
    try {
      const room = (payload.room || '').trim().toLowerCase();
      if (!room) return;

      const user = getUser(socket.id);
      const username = user ? user.username : 'Someone';

      // Broadcast only to other members in the same room
      socket.broadcast.to(room).emit('typing:update', {
        username,
        isTyping: true,
        room
      });
    } catch (err) {
      console.error('[TYPING START ERROR]', err);
    }
  });

  /**
   * typing:stop - Client -> Server
   * Payload: { "room": "developers" }
   */
  socket.on('typing:stop', (payload = {}) => {
    try {
      const room = (payload.room || '').trim().toLowerCase();
      if (!room) return;

      const user = getUser(socket.id);
      const username = user ? user.username : 'Someone';

      // Broadcast stopped typing to room members
      socket.broadcast.to(room).emit('typing:update', {
        username,
        isTyping: false,
        room
      });
    } catch (err) {
      console.error('[TYPING STOP ERROR]', err);
    }
  });

  /**
   * direct:send - Client -> Server
   * Payload: { "recipientId": "socket_id_xyz", "message": "Secret DM" }
   */
  socket.on('direct:send', (payload = {}) => {
    try {
      const recipientId = payload.recipientId;
      const text = (payload.message || '').trim();

      if (!recipientId || !text) {
        return socket.emit('direct:error', { message: 'Recipient ID and message text are required.' });
      }

      const sender = getUser(socket.id);
      const senderName = sender ? sender.username : `User_${socket.id.slice(0, 4)}`;
      const senderAvatar = sender ? sender.avatar : 'avatar1.png';

      const recipient = getUser(recipientId);
      if (!recipient) {
        return socket.emit('direct:error', { message: 'Recipient is not connected or has gone offline.' });
      }

      const timestamp = formatTime();
      const messageId = `dm_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;

      // 1. Deliver to recipient socket ONLY
      io.to(recipientId).emit('direct:receive', {
        id: messageId,
        from: senderName,
        fromId: socket.id,
        avatar: senderAvatar,
        message: text,
        timestamp
      });

      // 2. Deliver confirmation back to sender so their thread updates
      socket.emit('direct:sent', {
        id: messageId,
        to: recipient.username,
        recipientId,
        message: text,
        timestamp,
        self: true
      });

      console.log(`[DM] ${senderName} -> ${recipient.username}: ${text}`);
    } catch (err) {
      console.error('[DIRECT SEND ERROR]', err);
      socket.emit('direct:error', { message: 'Internal error sending direct message.' });
    }
  });
};
