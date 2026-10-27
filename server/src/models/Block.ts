import mongoose, { Schema, Document } from 'mongoose';

export interface BlockDocument extends Document {
  blocker: mongoose.Types.ObjectId;
  blocked: mongoose.Types.ObjectId;
  createdAt: Date;
}

const BlockSchema = new Schema<BlockDocument>(
  {
    blocker: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    blocked: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
  }
);

BlockSchema.index({ blocker: 1, blocked: 1 }, { unique: true });

export const Block = mongoose.model<BlockDocument>('Block', BlockSchema);
