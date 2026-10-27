import mongoose, { Schema, Document } from 'mongoose';
import { IConversation } from '../types/index.js';

export interface ConversationDocument extends Omit<IConversation, '_id'>, Document {}

const ConversationSchema = new Schema<ConversationDocument>(
  {
    type: {
      type: String,
      enum: ['direct', 'group', 'channel'],
      required: true,
    },
    name: {
      type: String,
      trim: true,
      maxlength: 60,
    },
    description: {
      type: String,
      trim: true,
      maxlength: 250,
      default: '',
    },
    creator: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    code: {
      type: String,
      trim: true,
      uppercase: true,
      sparse: true,
    },
    avatar: {
      type: String,
      default: '',
    },
    lastMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastMessageAt: {
      type: Date,
      default: Date.now,
    },
    isPublicChannel: {
      type: Boolean,
      default: false,
    },
    pinnedMessageIds: [
      {
        type: Schema.Types.ObjectId,
        ref: 'Message',
      },
    ],
  },
  {
    timestamps: true,
  }
);

ConversationSchema.index({ isPublicChannel: 1 });
ConversationSchema.index({ lastMessageAt: -1 });

export const Conversation = mongoose.model<ConversationDocument>('Conversation', ConversationSchema);
