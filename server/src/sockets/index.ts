import { Server as SocketIOServer, Socket } from 'socket.io';
import jwt from 'jsonwebtoken';
import { config } from '../config/env.js';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Membership } from '../models/Membership.js';
import { Message } from '../models/Message.js';
import { Reaction } from '../models/Reaction.js';
import { Notification } from '../models/Notification.js';
import { logger } from '../utils/logger.js';
import { AuthUserPayload } from '../types/index.js';

interface SocketUser {
  id: string;
  username: string;
  displayName: string;
  avatar: string;
  role: string;
}

// Track active connections per user
const activeUsers = new Map<string, { user: SocketUser; socketIds: Set<string> }>();
let ioInstance: SocketIOServer | null = null;

export function broadcastUserProfileUpdate(payload: { userId: string; displayName: string; avatar: string }) {
  if (activeUsers.has(payload.userId)) {
    const item = activeUsers.get(payload.userId)!;
    item.user.avatar = payload.avatar;
    item.user.displayName = payload.displayName;
  }
  if (ioInstance) {
    ioInstance.emit('user:profile_updated', payload);
    broadcastPresence(ioInstance);
  }
}

export function broadcastChatMessage(formattedMsg: any, conv: any) {
  if (!ioInstance) return;
  ioInstance.to(conv._id.toString()).emit('chat:receive', formattedMsg);
  if (conv.name) {
    ioInstance.to(conv.name).emit('chat:receive', formattedMsg);
    ioInstance.to(conv.name.toLowerCase()).emit('chat:receive', formattedMsg);
  }
}

export function setupSocketIO(io: SocketIOServer): void {
  ioInstance = io;
  // Authentication Handshake Middleware
  io.use(async (socket: Socket, next) => {
    try {
      let token = socket.handshake.auth?.token;

      if (!token && socket.handshake.headers.cookie) {
        const cookies = Object.fromEntries(
          socket.handshake.headers.cookie.split('; ').map((c) => {
            const [k, ...v] = c.split('=');
            return [k, decodeURIComponent(v.join('='))];
          })
        );
        token = cookies['token'];
      }

      if (!token) {
        return next(new Error('Authentication required for real-time connection.'));
      }

      const decoded = jwt.verify(token, config.jwtSecret) as AuthUserPayload;
      const user = await User.findById(decoded.id).select('_id username displayName avatar role isSuspended');

      if (!user || user.isSuspended) {
        return next(new Error('User account not found or suspended.'));
      }

      socket.data.user = {
        id: user._id.toString(),
        username: user.username,
        displayName: user.displayName,
        avatar: user.avatar,
        role: user.role,
      };

      socket.data.typingTimers = new Map<string, NodeJS.Timeout>();

      next();
    } catch (err) {
      next(new Error('Invalid or expired real-time authentication token.'));
    }
  });

  io.on('connection', (socket: Socket) => {
    const user = socket.data.user as SocketUser;
    logger.info(`✦ Socket connected: ${socket.id} (User: ${user.username})`);

    // Add to active users map
    if (!activeUsers.has(user.id)) {
      activeUsers.set(user.id, { user, socketIds: new Set([socket.id]) });
    } else {
      activeUsers.get(user.id)!.socketIds.add(socket.id);
    }

    // Join user's individual room for multi-device notifications
    socket.join(`user:${user.id}`);

    // Broadcast updated presence to all clients immediately
    broadcastPresence(io);

    // Asynchronously join public channels & emit user:ready without blocking event registration
    (async () => {
      try {
        const publicChannels = await Conversation.find({ isPublicChannel: true });
        for (const channel of publicChannels) {
          socket.join(channel._id.toString());
          if (channel.name) {
            socket.join(channel.name);
            socket.join(channel.name.toLowerCase());
          }
        }
        socket.emit('user:ready', {
          user: {
            id: user.id,
            username: user.username,
            displayName: user.displayName,
            avatar: user.avatar,
          },
          publicRooms: publicChannels.map((c) => c.name),
          onlineUsers: getOnlineUsersList(),
        });
      } catch (err) {
        logger.error({ err }, 'Error auto-joining public channels');
      }
    })();

    // Helper to find conversation by ID or case-insensitive name
    const findConversationByRoom = async (roomIdentifier: string) => {
      const clean = String(roomIdentifier).replace(/^#/, '').trim();
      const isObjectId = /^[0-9a-fA-F]{24}$/.test(clean);
      const escaped = clean.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

      return await Conversation.findOne({
        $or: [
          ...(isObjectId ? [{ _id: clean }] : []),
          { name: { $regex: new RegExp(`^${escaped}$`, 'i') }, isPublicChannel: true },
          { name: clean },
        ],
      });
    };

    // 1. Join conversation room
    socket.on('room:join', async ({ room } = {}) => {
      try {
        if (!room) return;
        const conv = await findConversationByRoom(room);

        if (!conv) {
          logger.warn({ room }, 'Conversation or channel not found in room:join');
          socket.emit('app:error', { message: 'Conversation or channel not found.' });
          return;
        }

        // Check authorization if not public
        if (!conv.isPublicChannel) {
          const isMember = await Membership.findOne({ conversation: conv._id, user: user.id });
          if (!isMember) {
            socket.emit('app:error', { message: 'You are not a member of this conversation.' });
            return;
          }
        }

        socket.join(conv._id.toString());
        if (conv.name) {
          socket.join(conv.name);
          socket.join(conv.name.toLowerCase());
        }

        io.to(conv._id.toString()).emit('room:userlist', {
          room: conv.name || conv._id.toString(),
          users: getOnlineUsersList(),
        });
      } catch (err) {
        logger.error({ err }, 'Error in room:join');
      }
    });

    // 2. Typing Indicators
    socket.on('typing:start', ({ room } = {}) => {
      if (!room) return;
      const targetRoom = String(room).replace(/^#/, '').trim();
      socket.to(targetRoom).emit('typing:update', {
        username: user.displayName || user.username,
        userId: user.id,
        isTyping: true,
        room: targetRoom,
      });

      // Clear existing timer if any
      clearTimeout(socket.data.typingTimers.get(targetRoom));
      socket.data.typingTimers.set(
        targetRoom,
        setTimeout(() => {
          socket.to(targetRoom).emit('typing:update', {
            username: user.displayName || user.username,
            userId: user.id,
            isTyping: false,
            room: targetRoom,
          });
        }, 2000)
      );
    });

    socket.on('typing:stop', ({ room } = {}) => {
      if (!room) return;
      const targetRoom = String(room).replace(/^#/, '').trim();
      clearTimeout(socket.data.typingTimers.get(targetRoom));
      socket.data.typingTimers.delete(targetRoom);
      socket.to(targetRoom).emit('typing:update', {
        username: user.displayName || user.username,
        userId: user.id,
        isTyping: false,
        room: targetRoom,
      });
    });

    // 3. Real-Time Chat Message Handler
    socket.on('chat:send', async ({ room, conversationId, message, type = 'text', replyTo, attachments, idempotencyKey } = {}) => {
      try {
        const targetIdentifier = conversationId || room;
        logger.info({ room, conversationId, targetIdentifier, message }, 'chat:send received by server');
        if (!targetIdentifier || (!message && (!attachments || attachments.length === 0))) {
          logger.warn('chat:send missing targetIdentifier or message');
          return;
        }

        const conv = await findConversationByRoom(targetIdentifier);

        if (!conv) {
          logger.warn({ room, conversationId }, 'Conversation not found in chat:send');
          socket.emit('app:error', { message: 'Conversation not found.' });
          return;
        }

        // Verify membership if not public
        if (!conv.isPublicChannel) {
          const isMember = await Membership.findOne({ conversation: conv._id, user: user.id });
          if (!isMember) {
            socket.emit('app:error', { message: 'Access denied.' });
            return;
          }
        }

        // Idempotency check
        if (idempotencyKey) {
          const existing = await Message.findOne({ conversation: conv._id, idempotencyKey }).populate(
            'sender',
            'username displayName avatar'
          );
          if (existing) {
            socket.emit('chat:receive', existing);
            return;
          }
        }

        const newMsg = await Message.create({
          conversation: conv._id,
          sender: user.id,
          type,
          content: message || '',
          replyTo: replyTo || undefined,
          attachments: attachments || [],
          idempotencyKey: idempotencyKey || undefined,
        });

        await newMsg.populate('sender', 'username displayName avatar');
        if (replyTo) {
          await newMsg.populate({
            path: 'replyTo',
            select: 'content sender createdAt isDeleted',
            populate: { path: 'sender', select: 'username displayName' },
          });
        }

        conv.lastMessage = newMsg._id as any;
        conv.lastMessageAt = new Date();
        await conv.save();

        const formattedMsg = {
          id: newMsg._id.toString(),
          _id: newMsg._id.toString(),
          conversationId: conv._id.toString(),
          sender: newMsg.sender,
          senderId: user.id,
          message: newMsg.content,
          content: newMsg.content,
          type: newMsg.type,
          replyTo: newMsg.replyTo,
          attachments: newMsg.attachments,
          isEdited: newMsg.isEdited,
          isDeleted: newMsg.isDeleted,
          createdAt: newMsg.createdAt,
          timestamp: new Date(newMsg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          room: conv.name || conv._id.toString(),
          reactions: {},
        };

        // Broadcast to conversation ID and channel name rooms
        io.to(conv._id.toString()).emit('chat:receive', formattedMsg);
        if (conv.name) {
          io.to(conv.name).emit('chat:receive', formattedMsg);
          io.to(conv.name.toLowerCase()).emit('chat:receive', formattedMsg);
        }

        // Guaranteed sender confirmation
        socket.emit('chat:receive', formattedMsg);

        // If direct conversation or group, send notification to members
        const members = await Membership.find({ conversation: conv._id, user: { $ne: user.id } });
        for (const member of members) {
          if (!member.isMuted) {
            const notif = await Notification.create({
              recipient: member.user,
              sender: user.id,
              type: 'message',
              conversation: conv._id,
              message: newMsg._id,
              content: `${user.displayName}: ${newMsg.content.slice(0, 80)}`,
            });
            await notif.populate('sender', 'username displayName avatar');
            io.to(`user:${member.user}`).emit('notification:new', notif);
          }
        }
      } catch (err) {
        logger.error({ err }, 'Error handling chat:send');
        socket.emit('app:error', { message: 'Failed to send message.' });
      }
    });

    // 4. Reactions
    socket.on('reaction:toggle', async ({ messageId, emoji } = {}) => {
      try {
        if (!messageId || !emoji) return;

        const message = await Message.findById(messageId);
        if (!message) return;

        const existing = await Reaction.findOne({ message: messageId, user: user.id, emoji });
        if (existing) {
          await Reaction.deleteOne({ _id: existing._id });
        } else {
          await Reaction.create({ message: messageId, user: user.id, emoji });
        }

        const reactions = await Reaction.find({ message: messageId }).populate('user', 'username displayName');
        const reactionMap: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
        for (const r of reactions) {
          if (!reactionMap[r.emoji]) reactionMap[r.emoji] = { count: 0, users: [], hasReacted: false };
          reactionMap[r.emoji].count += 1;
          reactionMap[r.emoji].users.push((r.user as any)?.displayName || (r.user as any)?.username);
          if ((r.user as any)?._id.toString() === user.id) reactionMap[r.emoji].hasReacted = true;
        }

        io.to(message.conversation.toString()).emit('reaction:update', {
          messageId,
          reactions: reactionMap,
        });
      } catch (err) {
        logger.error({ err }, 'Error handling reaction:toggle');
      }
    });

    // Disconnect Handler
    socket.on('disconnect', async () => {
      logger.info(`✦ Socket disconnected: ${socket.id} (${user.username})`);
      const userSockets = activeUsers.get(user.id);
      if (userSockets) {
        userSockets.socketIds.delete(socket.id);
        if (userSockets.socketIds.size === 0) {
          activeUsers.delete(user.id);
          await User.findByIdAndUpdate(user.id, { lastActive: new Date() });
          broadcastPresence(io);
        }
      }
    });
  });
}

function getOnlineUsersList() {
  return Array.from(activeUsers.values()).map((item) => ({
    id: item.user.id,
    username: item.user.username,
    displayName: item.user.displayName,
    avatar: item.user.avatar,
    status: 'online',
  }));
}

function broadcastPresence(io: SocketIOServer) {
  io.emit('presence:update', {
    users: getOnlineUsersList(),
  });
}
