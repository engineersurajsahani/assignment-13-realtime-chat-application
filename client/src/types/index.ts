export type ThemeMode = 'light' | 'dark' | 'system';

export interface User {
  id: string;
  username: string;
  displayName: string;
  email?: string;
  avatar: string;
  statusMessage?: string;
  role?: 'user' | 'admin';
  preferences?: {
    theme: ThemeMode;
    notifications: boolean;
  };
  lastActive?: string;
}

export interface Attachment {
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

export interface MessageReaction {
  count: number;
  users: string[];
  hasReacted: boolean;
}

export interface Message {
  id: string;
  conversationId: string;
  sender: {
    _id?: string;
    id?: string;
    username: string;
    displayName: string;
    avatar: string;
  };
  senderId?: string;
  type: 'text' | 'image' | 'file' | 'audio' | 'system';
  content: string;
  replyTo?: {
    _id?: string;
    id?: string;
    content: string;
    isDeleted?: boolean;
    sender?: {
      username: string;
      displayName: string;
    };
  };
  attachments?: Attachment[];
  isEdited?: boolean;
  editedAt?: string;
  isDeleted?: boolean;
  createdAt: string;
  timestamp?: string;
  reactions?: Record<string, MessageReaction>;
}

export interface Conversation {
  id: string;
  type: 'channel' | 'group' | 'direct';
  name?: string;
  description?: string;
  code?: string;
  avatar?: string;
  isPublicChannel?: boolean;
  creator?: {
    username: string;
    displayName: string;
    avatar: string;
  };
  lastMessage?: any;
  lastMessageAt?: string;
  unreadCount: number;
  membership?: {
    role: 'owner' | 'admin' | 'member';
    isMuted: boolean;
    isArchived: boolean;
    lastReadAt?: string;
  } | null;
  otherParticipant?: User | null;
}

export interface ConversationMember {
  user: User;
  role: 'owner' | 'admin' | 'member';
  joinedAt: string;
}

export interface NotificationItem {
  _id: string;
  recipient: string;
  sender?: {
    username: string;
    displayName: string;
    avatar: string;
  };
  type: 'message' | 'mention' | 'group_invite' | 'system';
  conversation?: {
    _id: string;
    name?: string;
    type: string;
  };
  content: string;
  isRead: boolean;
  createdAt: string;
}
