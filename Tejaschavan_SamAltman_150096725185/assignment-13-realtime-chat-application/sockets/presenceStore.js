// sockets/presenceStore.js
// Shared presence store: socketId -> { username, avatar, currentRoom }
const connectedUsers = new Map();

module.exports = { connectedUsers };
