const MAX_HISTORY = 50;

class MessageStore {
  constructor() {
    this.roomHistories = new Map();
  }

  addMessage(room, message) {
    if (!this.roomHistories.has(room)) {
      this.roomHistories.set(room, []);
    }
    const messages = this.roomHistories.get(room);
    messages.push(message);
    if (messages.length > MAX_HISTORY) {
      messages.shift();
    }
  }

  getHistory(room) {
    return this.roomHistories.get(room) || [];
  }

  clearRoom(room) {
    this.roomHistories.delete(room);
  }
}

module.exports = new MessageStore();
module.exports.MAX_HISTORY = MAX_HISTORY;
