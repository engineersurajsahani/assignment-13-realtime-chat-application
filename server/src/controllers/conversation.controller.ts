import { Response } from 'express';
import mongoose from 'mongoose';
import { Conversation } from '../models/Conversation.js';
import { Membership } from '../models/Membership.js';
import { Message } from '../models/Message.js';
import { User } from '../models/User.js';
import { Block } from '../models/Block.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function makeGroupCode(): string {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function getConversations(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;

    // Find all memberships of the user
    const memberships = await Membership.find({ user: userId });
    const conversationIds = memberships.map((m) => m.conversation);

    // Also get all public channels
    const publicChannels = await Conversation.find({ isPublicChannel: true });
    const allConvIds = Array.from(
      new Set([...conversationIds.map((id) => id.toString()), ...publicChannels.map((c) => c._id.toString())])
    );

    const conversations = await Conversation.find({ _id: { $in: allConvIds } })
      .populate('creator', 'username displayName avatar')
      .populate({
        path: 'lastMessage',
        populate: { path: 'sender', select: 'username displayName avatar' },
      })
      .sort({ lastMessageAt: -1, updatedAt: -1 });

    // Enrich each conversation with membership details and unread count
    const enriched = await Promise.all(
      conversations.map(async (conv) => {
        const membership = memberships.find((m) => m.conversation.toString() === conv._id.toString());
        const lastReadAt = membership?.lastReadAt || new Date(0);

        const unreadCount = await Message.countDocuments({
          conversation: conv._id,
          sender: { $ne: userId },
          createdAt: { $gt: lastReadAt },
          isDeleted: false,
        });

        // If direct conversation, get the other participant
        let otherParticipant = null;
        if (conv.type === 'direct') {
          const directMemberships = await Membership.find({ conversation: conv._id }).populate(
            'user',
            'username displayName avatar lastActive statusMessage'
          );
          const otherMember = directMemberships.find((m) => (m.user as any)?._id.toString() !== userId);
          otherParticipant = otherMember ? otherMember.user : null;
        }

        return {
          id: conv._id,
          type: conv.type,
          name: conv.name,
          description: conv.description,
          code: conv.code,
          avatar: conv.avatar,
          isPublicChannel: conv.isPublicChannel,
          creator: conv.creator,
          lastMessage: conv.lastMessage,
          lastMessageAt: conv.lastMessageAt,
          unreadCount,
          membership: membership
            ? {
                role: membership.role,
                isMuted: membership.isMuted,
                isArchived: membership.isArchived,
                lastReadAt: membership.lastReadAt,
              }
            : null,
          otherParticipant,
        };
      })
    );

    res.json({ conversations: enriched });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch conversations.' });
  }
}

export async function getOrCreateDirect(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const recipientId = String(req.body.recipientId || req.body.userId || '').trim();

    if (!recipientId || recipientId === userId || !mongoose.Types.ObjectId.isValid(recipientId)) {
      res.status(400).json({ error: 'Valid recipient ID is required.' });
      return;
    }

    const recipient = await User.findById(recipientId);
    if (!recipient) {
      res.status(404).json({ error: 'Recipient user not found.' });
      return;
    }

    // Check if blocked
    const isBlocked = await Block.findOne({
      $or: [
        { blocker: userId, blocked: recipientId },
        { blocker: recipientId, blocked: userId },
      ],
    });
    if (isBlocked) {
      res.status(403).json({ error: 'Cannot start conversation with this user.' });
      return;
    }

    // Check existing direct conversation
    const userMemberships = await Membership.find({ user: userId });
    const userConvIds = userMemberships.map((m) => m.conversation);

    const directConvs = await Conversation.find({
      _id: { $in: userConvIds },
      type: 'direct',
    });

    for (const conv of directConvs) {
      const otherMembership = await Membership.findOne({
        conversation: conv._id,
        user: recipientId,
      });
      if (otherMembership) {
        res.json({
          conversationId: conv._id.toString(),
          conversation: {
            id: conv._id.toString(),
            _id: conv._id.toString(),
            type: conv.type,
            name: conv.name,
            creator: conv.creator,
          },
        });
        return;
      }
    }

    // Create new direct conversation
    const conversation = await Conversation.create({
      type: 'direct',
      name: `${recipient.displayName}`,
      creator: userId,
    });

    await Membership.create([
      { user: userId, conversation: conversation._id, role: 'member' },
      { user: recipientId, conversation: conversation._id, role: 'member' },
    ]);

    res.status(201).json({
      conversationId: conversation._id.toString(),
      conversation: {
        id: conversation._id.toString(),
        _id: conversation._id.toString(),
        type: conversation.type,
        name: conversation.name,
        creator: conversation.creator,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to start direct conversation.' });
  }
}

export async function createGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { name, description, memberIds = [] } = req.body;

    if (!name || !name.trim()) {
      res.status(400).json({ error: 'Group name is required.' });
      return;
    }

    const group = await Conversation.create({
      type: 'group',
      name: name.trim(),
      description: (description || 'Private conversation for invited members.').trim(),
      creator: userId,
      code: makeGroupCode(),
    });

    // Sanitize memberIds: accept string IDs or objects with id/_id
    const rawIds = Array.isArray(memberIds) ? memberIds : [];
    const validMemberIds = rawIds
      .map((item: any) => {
        if (!item) return '';
        if (typeof item === 'string') return item.trim();
        if (typeof item === 'object') return String(item.id || item._id || '').trim();
        return '';
      })
      .filter((mId: string) => mId && mId !== userId && mongoose.Types.ObjectId.isValid(mId));

    const uniqueMembers = Array.from(new Set([userId, ...validMemberIds]));

    const memberships = uniqueMembers.map((mId) => ({
      user: mId,
      conversation: group._id,
      role: mId === userId ? 'owner' : 'member',
    }));

    await Membership.insertMany(memberships);

    res.status(201).json({
      group: {
        id: group._id.toString(),
        _id: group._id.toString(),
        type: group.type,
        name: group.name,
        description: group.description,
        code: group.code,
        creator: group.creator,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create group.' });
  }
}

export async function joinGroupByCode(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { code } = req.body;

    const group = await Conversation.findOne({
      code: code.trim().toUpperCase(),
      type: 'group',
    });

    if (!group) {
      res.status(404).json({ error: 'Invalid group code or group does not exist.' });
      return;
    }

    let membership = await Membership.findOne({ user: userId, conversation: group._id });
    if (!membership) {
      membership = await Membership.create({
        user: userId,
        conversation: group._id,
        role: 'member',
      });
    }

    res.json({ message: 'Joined group successfully.', group });
  } catch (error) {
    res.status(500).json({ error: 'Failed to join group.' });
  }
}

export async function getConversation(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const conversation = await Conversation.findById(id).populate('creator', 'username displayName avatar');
    if (!conversation) {
      res.status(404).json({ error: 'Conversation not found.' });
      return;
    }

    // Verify membership if not public
    if (!conversation.isPublicChannel) {
      const isMember = await Membership.findOne({ conversation: id, user: userId });
      if (!isMember) {
        res.status(403).json({ error: 'You are not a member of this conversation.' });
        return;
      }
    }

    const rawMembers = await Membership.find({ conversation: id })
      .populate('user', 'username displayName avatar statusMessage lastActive')
      .sort({ role: 1, joinedAt: 1 });

    const members = rawMembers.filter((m: any) => m && m.user != null);

    res.json({ conversation, members });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation.' });
  }
}

export async function leaveGroup(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    const membership = await Membership.findOne({ conversation: id, user: userId });
    if (!membership) {
      res.status(404).json({ error: 'Membership not found.' });
      return;
    }

    await Membership.deleteOne({ _id: membership._id });
    res.json({ message: 'Left group successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to leave group.' });
  }
}

export async function toggleArchive(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    let membership = await Membership.findOne({ conversation: id, user: userId });
    if (!membership) {
      membership = await Membership.create({ user: userId, conversation: id, role: 'member', isArchived: true });
    } else {
      membership.isArchived = !membership.isArchived;
      await membership.save();
    }

    res.json({ isArchived: membership.isArchived });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle archive status.' });
  }
}

export async function toggleMute(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    let membership = await Membership.findOne({ conversation: id, user: userId });
    if (!membership) {
      membership = await Membership.create({ user: userId, conversation: id, role: 'member', isMuted: true });
    } else {
      membership.isMuted = !membership.isMuted;
      await membership.save();
    }

    res.json({ isMuted: membership.isMuted });
  } catch (error) {
    res.status(500).json({ error: 'Failed to toggle mute status.' });
  }
}

export async function getConversationMedia(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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

    const messages = await Message.find({
      conversation: id,
      isDeleted: false,
      'attachments.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatar');

    const mediaList: any[] = [];
    messages.forEach((m) => {
      m.attachments?.forEach((att) => {
        if (att.mimeType?.startsWith('image/') || att.mimeType?.startsWith('video/')) {
          mediaList.push({
            name: att.name,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            sender: m.sender,
            messageId: m._id,
            createdAt: m.createdAt,
          });
        }
      });
    });

    res.json({ media: mediaList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation media.' });
  }
}

export async function getConversationLinks(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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

    const messages = await Message.find({
      conversation: id,
      isDeleted: false,
      content: { $regex: /https?:\/\//i },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatar');

    const linkList: any[] = [];
    const urlRegex = /(https?:\/\/[^\s<>"{}|\^`\\[\]]+)/gi;

    messages.forEach((m) => {
      const matches = m.content.match(urlRegex);
      if (matches) {
        matches.forEach((u) => {
          let domain = '';
          try {
            domain = new URL(u).hostname.replace(/^www\./, '');
          } catch {
            domain = u.slice(0, 30);
          }
          linkList.push({
            url: u,
            domain,
            sender: m.sender,
            messageId: m._id,
            createdAt: m.createdAt,
          });
        });
      }
    });

    res.json({ links: linkList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation links.' });
  }
}

export async function getConversationDocs(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

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

    const messages = await Message.find({
      conversation: id,
      isDeleted: false,
      'attachments.0': { $exists: true },
    })
      .sort({ createdAt: -1 })
      .populate('sender', 'username displayName avatar');

    const docList: any[] = [];
    messages.forEach((m) => {
      m.attachments?.forEach((att) => {
        if (!att.mimeType?.startsWith('image/') && !att.mimeType?.startsWith('video/')) {
          docList.push({
            name: att.name,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            sender: m.sender,
            messageId: m._id,
            createdAt: m.createdAt,
          });
        }
      });
    });

    res.json({ docs: docList });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve conversation documents.' });
  }
}

export async function searchUniversal(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const queryStr = ((req.query.q as string) || '').trim();

    if (!queryStr || queryStr.length < 2) {
      res.json({ channels: [], people: [], messages: [], files: [] });
      return;
    }

    const regex = new RegExp(queryStr, 'i');

    // 1. Authorized conversation IDs for this user
    const memberships = await Membership.find({ user: userId });
    const userConvIds = memberships.map((m) => m.conversation);
    const publicChannels = await Conversation.find({ isPublicChannel: true });
    const allAuthorizedConvIds = Array.from(
      new Set([...userConvIds.map((id) => id.toString()), ...publicChannels.map((c) => c._id.toString())])
    );

    // 2. Channels (matching public channels or groups user is in)
    const matchingChannels = await Conversation.find({
      _id: { $in: allAuthorizedConvIds },
      name: { $regex: regex },
    }).select('name type description isPublicChannel code');

    // 3. People
    const matchingPeople = await User.find({
      _id: { $ne: userId },
      $or: [{ username: { $regex: regex } }, { displayName: { $regex: regex } }],
    }).select('username displayName avatar lastActive');

    // 4. Messages (strictly in authorized conversations)
    const matchingMessages = await Message.find({
      conversation: { $in: allAuthorizedConvIds },
      content: { $regex: regex },
      isDeleted: false,
    })
      .sort({ createdAt: -1 })
      .limit(30)
      .populate('sender', 'username displayName avatar')
      .populate('conversation', 'name type isPublicChannel');

    // 5. Files / Attachments
    const matchingFiles = await Message.find({
      conversation: { $in: allAuthorizedConvIds },
      isDeleted: false,
      'attachments.name': { $regex: regex },
    })
      .sort({ createdAt: -1 })
      .limit(20)
      .populate('sender', 'username displayName avatar')
      .populate('conversation', 'name type');

    res.json({
      channels: matchingChannels.map((c) => ({
        id: c._id,
        name: c.name,
        type: c.type,
        description: c.description,
        isPublicChannel: c.isPublicChannel,
      })),
      people: matchingPeople.map((u) => ({
        id: u._id,
        username: u.username,
        displayName: u.displayName,
        avatar: u.avatar,
        lastActive: u.lastActive,
      })),
      messages: matchingMessages.map((m) => ({
        id: m._id,
        content: m.content,
        createdAt: m.createdAt,
        conversationId: (m.conversation as any)?._id || m.conversation,
        conversationName: (m.conversation as any)?.name || 'Conversation',
        conversationType: (m.conversation as any)?.type || 'channel',
        sender: m.sender,
      })),
      files: matchingFiles.flatMap((m) =>
        (m.attachments || [])
          .filter((att) => att.name && regex.test(att.name))
          .map((att) => ({
            id: `${m._id}-${att.name}`,
            name: att.name,
            url: att.url,
            size: att.size,
            mimeType: att.mimeType,
            conversationId: (m.conversation as any)?._id || m.conversation,
            sender: m.sender,
            createdAt: m.createdAt,
          }))
      ),
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to execute universal search.' });
  }
}

