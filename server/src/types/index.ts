import { Types } from 'mongoose';

export type UserRole = 'user' | 'admin';
export type ThemePreference = 'light' | 'dark' | 'system';

export interface IUser {
  _id: Types.ObjectId | string;
  username: string;
  displayName: string;
  email: string;
  passwordHash: string;
  avatar: string;
  statusMessage?: string;
  role: UserRole;
  isSuspended: boolean;
  lastActive: Date;
  preferences: {
    theme: ThemePreference;
    notifications: boolean;
  };
  createdAt: Date;
  updatedAt: Date;
}

export type ConversationType = 'direct' | 'group' | 'channel';

export interface IConversation {
  _id: Types.ObjectId | string;
  type: ConversationType;
  name?: string;
  description?: string;
  creator?: Types.ObjectId | string;
  code?: string;
  avatar?: string;
  lastMessage?: Types.ObjectId | string;
  lastMessageAt?: Date;
  isPublicChannel?: boolean;
  pinnedMessageIds?: (Types.ObjectId | string)[];
  createdAt: Date;
  updatedAt: Date;
}

export type MemberRole = 'owner' | 'admin' | 'member';

export interface IMembership {
  _id: Types.ObjectId | string;
  user: Types.ObjectId | string;
  conversation: Types.ObjectId | string;
  role: MemberRole;
  joinedAt: Date;
  isMuted: boolean;
  isArchived: boolean;
  lastReadMessage?: Types.ObjectId | string;
  lastReadAt?: Date;
}

export interface IAttachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface IMessage {
  _id: Types.ObjectId | string;
  conversation: Types.ObjectId | string;
  sender: Types.ObjectId | string;
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  content: string;
  replyTo?: Types.ObjectId | string;
  attachments?: IAttachment[];
  idempotencyKey?: string;
  isEdited: boolean;
  editedAt?: Date;
  isDeleted: boolean;
  deletedAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface IReaction {
  _id: Types.ObjectId | string;
  message: Types.ObjectId | string;
  user: Types.ObjectId | string;
  emoji: string;
  createdAt: Date;
}

export interface INotification {
  _id: Types.ObjectId | string;
  recipient: Types.ObjectId | string;
  sender?: Types.ObjectId | string;
  type: 'message' | 'mention' | 'group_invite' | 'system';
  conversation?: Types.ObjectId | string;
  message?: Types.ObjectId | string;
  content: string;
  isRead: boolean;
  createdAt: Date;
}

export interface AuthUserPayload {
  id: string;
  username: string;
  email: string;
  role: UserRole;
}
