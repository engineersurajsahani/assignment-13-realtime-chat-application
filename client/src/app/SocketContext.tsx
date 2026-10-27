import React, { createContext, useContext, useEffect, useState, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { useAuth } from './AuthContext.js';

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  onlineUsers: Array<{ id: string; username: string; displayName: string; avatar: string }>;
  typingUsers: string[];
  joinRoom: (room: string) => void;
  sendChatMessage: (data: {
    room: string;
    conversationId?: string;
    message?: string;
    type?: string;
    replyTo?: string;
    attachments?: any[];
    idempotencyKey?: string;
  }) => void;
  startTyping: (room: string) => void;
  stopTyping: (room: string) => void;
  toggleReaction: (messageId: string, emoji: string) => void;
}

const SocketContext = createContext<SocketContextType | undefined>(undefined);

export function SocketProvider({ children }: { children: React.ReactNode }) {
  const { token, user } = useAuth();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [onlineUsers, setOnlineUsers] = useState<Array<{ id: string; username: string; displayName: string; avatar: string }>>([]);
  const [typingUsers, setTypingUsers] = useState<string[]>([]);
  const socketRef = useRef<Socket | null>(null);

  useEffect(() => {
    if (!token || !user) {
      if (socketRef.current) {
        socketRef.current.disconnect();
        socketRef.current = null;
        setSocket(null);
        setIsConnected(false);
      }
      return;
    }

    const getSocketUrl = (): string | undefined => {
      const envSocket = import.meta.env.VITE_SOCKET_URL;
      if (envSocket && envSocket.trim()) return envSocket.trim();

      const envApi = import.meta.env.VITE_API_URL;
      if (envApi && /^https?:\/\//i.test(envApi)) {
        return envApi.replace(/\/api\/?$/i, '').replace(/\/+$/, '');
      }

      if (typeof window !== 'undefined' && (window.location.hostname.includes('vercel.app') || !window.location.hostname.includes('localhost'))) {
        return 'https://chatterly-ql6l.onrender.com';
      }

      return undefined;
    };

    const SOCKET_URL = getSocketUrl();

    const newSocket = io(SOCKET_URL || undefined, {
      auth: { token },
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });


    socketRef.current = newSocket;
    setSocket(newSocket);

    newSocket.on('connect', () => {
      setIsConnected(true);
    });

    newSocket.on('disconnect', () => {
      setIsConnected(false);
    });

    newSocket.on('connect_error', () => {
      setIsConnected(false);
    });

    newSocket.on('presence:update', (data: { users: any[] }) => {
      setOnlineUsers(data.users || []);
    });

    newSocket.on('typing:update', (data: { username: string; isTyping: boolean }) => {
      setTypingUsers((prev) => {
        if (data.isTyping) {
          if (!prev.includes(data.username)) return [...prev, data.username];
          return prev;
        } else {
          return prev.filter((u) => u !== data.username);
        }
      });
    });

    return () => {
      newSocket.disconnect();
      socketRef.current = null;
    };
  }, [token, user]);

  const joinRoom = (room: string) => {
    socketRef.current?.emit('room:join', { room });
  };

  const sendChatMessage = (data: any) => {
    socketRef.current?.emit('chat:send', data);
  };

  const startTyping = (room: string) => {
    socketRef.current?.emit('typing:start', { room });
  };

  const stopTyping = (room: string) => {
    socketRef.current?.emit('typing:stop', { room });
  };

  const toggleReaction = (messageId: string, emoji: string) => {
    socketRef.current?.emit('reaction:toggle', { messageId, emoji });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        onlineUsers,
        typingUsers,
        joinRoom,
        sendChatMessage,
        startTyping,
        stopTyping,
        toggleReaction,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}

export function useSocket() {
  const context = useContext(SocketContext);
  if (!context) {
    throw new Error('useSocket must be used within a SocketProvider');
  }
  return context;
}
