import mongoose, { Schema, Document } from 'mongoose';
import { INotification } from '../types/index.js';

export interface NotificationDocument extends Omit<INotification, '_id'>, Document {}

const NotificationSchema = new Schema<NotificationDocument>(
  {
    recipient: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    sender: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    type: {
      type: String,
      enum: ['message', 'mention', 'group_invite', 'system'],
      default: 'message',
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
    },
    message: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    content: {
      type: String,
      required: true,
      maxlength: 500,
    },
    isRead: {
      type: Boolean,
      default: false,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

NotificationSchema.index({ recipient: 1, createdAt: -1 });

export const Notification = mongoose.model<NotificationDocument>('Notification', NotificationSchema);
