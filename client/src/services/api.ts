import axios from 'axios';
import { User, Conversation, Message, NotificationItem } from '../types/index.js';

const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl && envUrl.trim()) {
    return envUrl.trim().replace(/\/+$/, '');
  }
  if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || !window.location.hostname.includes('localhost'))) {
    return 'https://chatterly-ql6l.onrender.com/api';
  }
  return '/api';
};

const API_URL = getApiBaseUrl();

export const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('pulsechat_token');
  if (token && config.headers) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && !window.location.pathname.includes('/login')) {
      localStorage.removeItem('pulsechat_token');
    }
    return Promise.reject(error);
  }
);

export const authService = {
  register: (data: any) => api.post('/auth/register', data),
  login: (data: any) => api.post('/auth/login', data),
  logout: () => api.post('/auth/logout'),
  getMe: () => api.get<{ user: User }>('/auth/me'),
  updateProfile: (data: any) => api.patch<{ user: User }>('/auth/profile', data),
  changePassword: (data: any) => api.post('/auth/change-password', data),
};

export const conversationService = {
  getConversations: () => api.get<{ conversations: Conversation[] }>('/conversations'),
  getConversation: (id: string) => api.get<{ conversation: Conversation; members: any[] }>(`/conversations/${id}`),
  getOrCreateDirect: (recipientId: string) => api.post<{ conversationId: string }>('/conversations/direct', { recipientId }),
  createGroup: (data: { name: string; description?: string; memberIds?: string[] }) =>
    api.post<{ group: Conversation }>('/conversations/group', data),
  joinGroup: (code: string) => api.post<{ group: Conversation }>('/conversations/join', { code }),
  leaveGroup: (id: string) => api.post(`/conversations/${id}/leave`),
  toggleArchive: (id: string) => api.post(`/conversations/${id}/archive`),
  toggleMute: (id: string) => api.post(`/conversations/${id}/mute`),
  getConversationMedia: (id: string) => api.get<{ media: any[] }>(`/conversations/${id}/media`),
  getConversationLinks: (id: string) => api.get<{ links: any[] }>(`/conversations/${id}/links`),
  getConversationDocs: (id: string) => api.get<{ docs: any[] }>(`/conversations/${id}/docs`),
  searchUniversal: (query: string) =>
    api.get<{
      channels: any[];
      people: any[];
      messages: any[];
      files: any[];
    }>('/conversations/search/all', { params: { q: query } }),
};

export const messageService = {
  getMessages: (conversationId: string, before?: string, limit = 30) =>
    api.get<{ messages: Message[]; hasMore: boolean; nextCursor: string | null }>(
      `/conversations/${conversationId}/messages`,
      { params: { before, limit } }
    ),
  sendMessage: (conversationId: string, data: any) =>
    api.post<{ message: Message }>(`/conversations/${conversationId}/messages`, data),
  editMessage: (messageId: string, content: string) =>
    api.patch<{ message: Message }>(`/messages/${messageId}`, { content }),
  deleteMessage: (messageId: string) => api.delete(`/messages/${messageId}`),
  toggleReaction: (messageId: string, emoji: string) =>
    api.post(`/messages/${messageId}/reactions`, { emoji }),
  togglePin: (messageId: string) => api.post<{ isPinned: boolean }>(`/messages/${messageId}/pin`),
};

export const userService = {
  searchUsers: (q: string) => api.get<{ users: User[] }>('/users/search', { params: { q } }),
  blockUser: (id: string) => api.post(`/users/${id}/block`),
  unblockUser: (id: string) => api.delete(`/users/${id}/block`),
  getBlockedUsers: () => api.get<{ blockedUsers: User[] }>('/users/blocked'),
  uploadAvatar: (file: File | Blob) => {
    const formData = new FormData();
    formData.append('avatar', file, 'avatar.jpg');
    return api.post<{ message: string; avatarUrl: string; user: User }>('/users/avatar', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
  removeAvatar: () => api.delete<{ message: string; user: User }>('/users/avatar'),
  uploadFile: (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    return api.post<{ name: string; url: string; size: number; mimeType: string }>('/users/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
  },
};

export const notificationService = {
  getNotifications: () => api.get<{ notifications: NotificationItem[]; unreadCount: number }>('/notifications'),
  markAsRead: (id: string) => api.post(`/notifications/${id}/read`),
  markAllAsRead: () => api.post('/notifications/read-all'),
};

export const moderationService = {
  submitReport: (data: { targetType: 'user' | 'message'; targetId: string; reason: string }) =>
    api.post('/moderation/report', data),
  getReports: () => api.get('/moderation/reports'),
  updateReportStatus: (id: string, status: string) => api.patch(`/moderation/reports/${id}`, { status }),
  toggleSuspendUser: (id: string) => api.post(`/moderation/users/${id}/suspend`),
};

export const aiService = {
  summarizeConversation: (conversationId: string, scope: 'recent-24h' | 'last-50' | 'all-unread' = 'last-50') =>
    api.post<{
      overview: string;
      keyTopics: string[];
      decisions: string[];
      actionItems: Array<{ task: string; assignee?: string; deadline?: string; reference?: string }>;
      deadlines: string[];
      openQuestions: string[];
      messageCount: number;
      scope: string;
      engine: string;
    }>('/ai/summarize', { conversationId, scope }),

  chatWithAI: (
    message: string,
    history: Array<{ role: 'user' | 'assistant'; content: string }> = [],
    attachment?: { name: string; url: string; size?: number; mimeType?: string }
  ) =>
    api.post<{
      reply: string;
      engine: string;
      isConfigured: boolean;
    }>('/ai/chat', { message, history, attachment }),
};
