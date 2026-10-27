import { Response } from 'express';
import { Notification } from '../models/Notification.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function getNotifications(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const notifications = await Notification.find({ recipient: userId })
      .populate('sender', 'username displayName avatar')
      .populate('conversation', 'name type')
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ recipient: userId, isRead: false });

    res.json({ notifications, unreadCount });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch notifications.' });
  }
}

export async function markAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const userId = req.user!.id;

    await Notification.findOneAndUpdate({ _id: id, recipient: userId }, { isRead: true });
    res.json({ message: 'Marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notification.' });
  }
}

export async function markAllAsRead(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    await Notification.updateMany({ recipient: userId, isRead: false }, { isRead: true });
    res.json({ message: 'All notifications marked as read.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update notifications.' });
  }
}
