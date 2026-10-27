import mongoose, { Schema, Document } from 'mongoose';
import { IReaction } from '../types/index.js';

export interface ReactionDocument extends Omit<IReaction, '_id'>, Document {}

const ReactionSchema = new Schema<ReactionDocument>(
  {
    message: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
      required: true,
      index: true,
    },
    user: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    emoji: {
      type: String,
      required: true,
      trim: true,
      maxlength: 16,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

ReactionSchema.index({ message: 1, user: 1, emoji: 1 }, { unique: true });

export const Reaction = mongoose.model<ReactionDocument>('Reaction', ReactionSchema);
