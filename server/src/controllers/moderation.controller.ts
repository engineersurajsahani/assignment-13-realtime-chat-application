import { Response } from 'express';
import { Report } from '../models/Report.js';
import { User } from '../models/User.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

export async function submitReport(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const userId = req.user!.id;
    const { targetType, targetId, reason } = req.body;

    const report = await Report.create({
      reporter: userId,
      targetType,
      targetUser: targetType === 'user' ? targetId : undefined,
      targetMessage: targetType === 'message' ? targetId : undefined,
      reason,
      status: 'pending',
    });

    res.status(201).json({ message: 'Report submitted successfully. Thank you for keeping Chatterly safe.', report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to submit report.' });
  }
}

export async function getReports(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const reports = await Report.find()
      .populate('reporter', 'username displayName')
      .populate('targetUser', 'username displayName isSuspended')
      .populate('targetMessage', 'content isDeleted')
      .sort({ createdAt: -1 });

    res.json({ reports });
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch reports.' });
  }
}

export async function updateReportStatus(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const { status } = req.body;

    const report = await Report.findByIdAndUpdate(id, { status }, { new: true });
    res.json({ report });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update report.' });
  }
}

export async function toggleSuspendUser(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { id } = req.params;
    const user = await User.findById(id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    user.isSuspended = !user.isSuspended;
    await user.save();

    res.json({ isSuspended: user.isSuspended, username: user.username });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update account status.' });
  }
}
