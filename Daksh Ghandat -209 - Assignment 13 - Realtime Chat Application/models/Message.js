const mongoose = require("mongoose");

const messageSchema = new mongoose.Schema(
  {
    room: { type: String, required: true, index: true },
    messageId: { type: String, required: true, unique: true },
    sender: { type: String, required: true },
    avatar: { type: String, default: null },
    message: { type: String, required: true, trim: true },
    timestamp: { type: String, default: "" },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

const Message = mongoose.model("Message", messageSchema);

module.exports = Message;