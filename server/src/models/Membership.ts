import mongoose, { Schema, Document } from 'mongoose';
import { IMembership } from '../types/index.js';

export interface MembershipDocument extends Omit<IMembership, '_id'>, Document {}

const MembershipSchema = new Schema<MembershipDocument>(
  {
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    conversation: {
      type: Schema.Types.ObjectId,
      ref: 'Conversation',
      required: true,
    },
    role: {
      type: String,
      enum: ['owner', 'admin', 'member'],
      default: 'member',
    },
    joinedAt: {
      type: Date,
      default: Date.now,
    },
    isMuted: {
      type: Boolean,
      default: false,
    },
    isArchived: {
      type: Boolean,
      default: false,
    },
    lastReadMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    lastReadAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

MembershipSchema.index({ user: 1, conversation: 1 }, { unique: true });
MembershipSchema.index({ user: 1, isArchived: 1 });
MembershipSchema.index({ conversation: 1 });

export const Membership = mongoose.model<MembershipDocument>('Membership', MembershipSchema);
