import mongoose, { Schema, Document } from 'mongoose';

export interface ReportDocument extends Document {
  reporter: mongoose.Types.ObjectId;
  targetType: 'user' | 'message';
  targetUser?: mongoose.Types.ObjectId;
  targetMessage?: mongoose.Types.ObjectId;
  reason: string;
  status: 'pending' | 'resolved' | 'dismissed';
  createdAt: Date;
  updatedAt: Date;
}

const ReportSchema = new Schema<ReportDocument>(
  {
    reporter: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    targetType: {
      type: String,
      enum: ['user', 'message'],
      required: true,
    },
    targetUser: {
      type: Schema.Types.ObjectId,
      ref: 'User',
    },
    targetMessage: {
      type: Schema.Types.ObjectId,
      ref: 'Message',
    },
    reason: {
      type: String,
      required: true,
      maxlength: 1000,
    },
    status: {
      type: String,
      enum: ['pending', 'resolved', 'dismissed'],
      default: 'pending',
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

export const Report = mongoose.model<ReportDocument>('Report', ReportSchema);
