import mongoose, { Schema, Document } from 'mongoose';
import { IMessage } from '../types/index.js';

export interface MessageDocument extends Omit<IMessage, '_id'>, Document {}

const AttachmentSchema = new Schema(
  {
    name: { type: String, required: true },
    url: { type: String, required: true },
    size: { type: Number, required: true },
    mimeType: { type: String, required: true },
  },
  { _id: false }
);

const MessageSchema = new Schema<MessageDocument>(
  {
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['text', 'image', 'file', 'audio', 'system'],
      default: 'text',
    },
    content: {
      type: String,
      default: '',
      maxlength: 5000,
    },
    replyTo: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    attachments: [AttachmentSchema],
    idempotencyKey: {
      type: String,
      sparse: true,
    },
    isEdited: {
      type: Boolean,
      default: false,
    },
    editedAt: {
      type: Date,
    },
    isDeleted: {
      type: Boolean,
      default: false,
    },
    deletedAt: {
      type: Date,
    },
  },
  {
    timestamps: true,
  }
);

MessageSchema.index({ conversation: 1, createdAt: -1 });
MessageSchema.index({ content: 'text' });

export const Message = mongoose.model<MessageDocument>('Message', MessageSchema);
