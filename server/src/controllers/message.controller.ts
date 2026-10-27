import { Response } from 'express';
import mongoose from 'mongoose';
import { Message } from '../models/Message.js';
import { Conversation } from '../models/Conversation.js';
import { Membership } from '../models/Membership.js';
import { Reaction } from '../models/Reaction.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';
import { broadcastChatMessage } from '../sockets/index.js';

export async function getMessages(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const limit = Math.min(parseInt(req.query.limit as string, 10) || 30, 100);
    const before = req.query.before as string;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    if (!conversation.isPublicChannel) {
      const isMember = await Membership.findOne({ conversation: id, user: userId });
      if (!isMember) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    }

    const query: any = { conversation: id };
    if (before) {
      query.createdAt = { $lt: new Date(before) };
    }

    const messages = await Message.find(query)
      .sort({ createdAt: -1 })
      .limit(limit)
      .populate('sender', 'username displayName avatar')
      .populate({
        path: 'replyTo',
        select: 'content sender createdAt isDeleted',
        populate: { path: 'sender', select: 'username displayName' },
      });

    // Populate reactions for these messages
    const messageIds = messages.map((m) => m._id);
    const reactions = await Reaction.find({ message: { $in: messageIds } }).populate('user', 'username displayName');

    const formattedMessages = messages.reverse().map((msg) => {
      const msgReactions = reactions.filter((r) => r.message.toString() === msg._id.toString());
      // Group reactions by emoji
      const reactionMap: Record<string, { count: number; users: string[]; hasReacted: boolean }> = {};
      for (const r of msgReactions) {
        if (!reactionMap[r.emoji]) {
          reactionMap[r.emoji] = { count: 0, users: [], hasReacted: false };
        }
        reactionMap[r.emoji].count += 1;
        reactionMap[r.emoji].users.push((r.user as any)?.displayName || (r.user as any)?.username);
        if ((r.user as any)?._id.toString() === userId) {
          reactionMap[r.emoji].hasReacted = true;
        }
      }

      return {
        id: msg._id,
        conversationId: msg.conversation,
        sender: msg.sender,
        type: msg.type,
        content: msg.isDeleted ? 'This message was deleted' : msg.content,
        replyTo: msg.replyTo,
        attachments: msg.attachments,
        isEdited: msg.isEdited,
        editedAt: msg.editedAt,
        isDeleted: msg.isDeleted,
        createdAt: msg.createdAt,
        reactions: reactionMap,
      };
    });

    // Mark as read in membership
    if (messages.length > 0) {
      const latestMessage = messages[messages.length - 1];
      await Membership.findOneAndUpdate(
        { user: userId, conversation: id },
        {
          lastReadMessage: latestMessage._id,
          lastReadAt: new Date(),
        },
        { upsert: false }
      );
    }

    const hasMore = messages.length === limit;
    const nextCursor = hasMore && messages.length > 0 ? messages[0].createdAt.toISOString() : null;

    res.json({
      messages: formattedMessages,
      hasMore,
      nextCursor,
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
}

export async function sendMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content, type = 'text', replyTo, idempotencyKey, attachments } = req.body;

    const conversation = await Conversation.findById(id);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    if (!conversation.isPublicChannel) {
      const isMember = await Membership.findOne({ conversation: id, user: userId });
      if (!isMember) {
        res.status(403).json({ error: 'Access denied.' });
        return;
      }
    }

    // Check idempotency key if provided
    if (idempotencyKey) {
      const existing = await Message.findOne({ conversation: id, idempotencyKey }).populate(
        'sender',
        'username displayName avatar'
      );
      if (existing) {
        res.json({ message: existing, duplicate: true });
        return;
      }
    }

    const message = await Message.create({
      conversation: id,
      sender: userId,
      type,
      content,
      replyTo: replyTo || undefined,
      attachments: attachments || [],
      idempotencyKey: idempotencyKey || undefined,
    });

    await message.populate('sender', 'username displayName avatar');
    if (replyTo) {
      await message.populate({
        path: 'replyTo',
        select: 'content sender createdAt isDeleted',
        populate: { path: 'sender', select: 'username displayName' },
      });
    }

    // Update conversation last message timestamp
    conversation.lastMessage = message._id as any;
    conversation.lastMessageAt = new Date();
    await conversation.save();

    const formattedMsg = {
      id: message._id.toString(),
      _id: message._id.toString(),
      conversationId: conversation._id.toString(),
      sender: message.sender,
      senderId: userId,
      message: message.content,
      content: message.content,
      type: message.type,
      replyTo: message.replyTo,
      attachments: message.attachments,
      isEdited: message.isEdited,
      isDeleted: message.isDeleted,
      createdAt: message.createdAt,
      timestamp: new Date(message.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      room: conversation.name || conversation._id.toString(),
      reactions: {},
    };
    broadcastChatMessage(formattedMsg, conversation);

    res.status(201).json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to send message.' });
  }
}

export async function editMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { content } = req.body;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    if (message.sender.toString() !== userId) {
      res.status(403).json({ error: 'You can only edit your own messages.' });
      return;
    }

    if (message.isDeleted) {
      res.status(400).json({ error: 'Cannot edit a deleted message.' });
      return;
    }

    message.content = content;
    message.isEdited = true;
    message.editedAt = new Date();
    await message.save();

    res.json({ message });
  } catch (error) {
    res.status(500).json({ error: 'Failed to edit message.' });
  }
}

export async function deleteMessage(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    const membership = await Membership.findOne({ conversation: message.conversation, user: userId });
    const isOwnerOrAdmin = membership && ['owner', 'admin'].includes(membership.role);

    if (message.sender.toString() !== userId && !isOwnerOrAdmin && req.user!.role !== 'admin') {
      res.status(403).json({ error: 'Not authorized to delete this message.' });
      return;
    }

    message.isDeleted = true;
    message.deletedAt = new Date();
    message.content = 'This message was deleted';
    await message.save();

    res.json({ message: 'Message deleted successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete message.' });
  }
}

export async function toggleReaction(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;
    const { emoji } = req.body;

    const existing = await Reaction.findOne({ message: id, user: userId, emoji });
    if (existing) {
      await Reaction.deleteOne({ _id: existing._id });
      res.json({ action: 'removed', emoji });
    } else {
      await Reaction.create({ message: id, user: userId, emoji });
      res.json({ action: 'added', emoji });
    }
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle reaction.' });
  }
}

export async function togglePin(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const id = Array.isArray(req.params.id) ? req.params.id[0] : req.params.id;

    const message = await Message.findById(id);
    if (!message) {
      res.status(404).json({ error: 'Message not found.' });
      return;
    }

    const conversation = await Conversation.findById(message.conversation);
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    const currentPins = conversation.pinnedMessageIds?.map((pid) => pid.toString()) || [];
    const isPinned = currentPins.includes(id);

    if (isPinned) {
      conversation.pinnedMessageIds = conversation.pinnedMessageIds?.filter((pid) => pid.toString() !== id);
    } else {
      if (!conversation.pinnedMessageIds) conversation.pinnedMessageIds = [];
      conversation.pinnedMessageIds.push(new mongoose.Types.ObjectId(id) as any);
    }

    await conversation.save();
    res.json({ isPinned: !isPinned });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle pin state.' });
  }
}
