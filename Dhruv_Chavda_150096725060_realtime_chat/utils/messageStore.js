// In-Memory Chat History Buffer (Circular Buffer capped at 50 messages per room)
const MAX_HISTORY = 50;

const roomHistories = {
  general: [
    {
      id: 'msg_welcome_1',
      sender: 'System Bot',
      message: 'Welcome to #general! Connect with peers and collaborate.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=System'
    }
  ],
  developers: [
    {
      id: 'msg_welcome_2',
      sender: 'System Bot',
      message: 'Welcome to #developers! Share code snippets and technical updates.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=DevBot'
    }
  ],
  random: [
    {
      id: 'msg_welcome_3',
      sender: 'System Bot',
      message: 'Welcome to #random! Chit-chat, memes, and off-topic discussions.',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      avatar: 'https://api.dicebear.com/7.x/bottts/svg?seed=RandomBot'
    }
  ]
};

function addMessageToHistory(room, messageObj) {
  const safeRoom = (room || 'general').toLowerCase();
  if (!roomHistories[safeRoom]) {
    roomHistories[safeRoom] = [];
  }

  roomHistories[safeRoom].push(messageObj);

  if (roomHistories[safeRoom].length > MAX_HISTORY) {
    roomHistories[safeRoom].shift(); // Remove oldest message
  }
}

function getRoomHistory(room) {
  const safeRoom = (room || 'general').toLowerCase();
  return roomHistories[safeRoom] || [];
}

module.exports = {
  addMessageToHistory,
  getRoomHistory,
  roomHistories
};
