import { Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { User } from '../models/User.js';
import { Conversation } from '../models/Conversation.js';
import { Membership } from '../models/Membership.js';
import { config } from '../config/env.js';
import { AuthenticatedRequest } from '../middleware/auth.middleware.js';

function generateToken(user: any): string {
  return jwt.sign(
    {
      id: user._id.toString(),
      username: user.username,
      email: user.email,
      role: user.role,
    },
    config.jwtSecret,
    { expiresIn: '7d' }
  );
}

function setTokenCookie(res: Response, token: string): void {
  res.cookie('token', token, {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
    maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
  });
}

export async function register(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { username, displayName, email, password, avatar } = req.body;

    const existingUsername = await User.findOne({ username: username.toLowerCase() });
    if (existingUsername) {
      res.status(409).json({ error: 'Username is already taken.' });
      return;
    }

    const existingEmail = await User.findOne({ email: email.toLowerCase() });
    if (existingEmail) {
      res.status(409).json({ error: 'Email address is already registered.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);

    const defaultAvatar = avatar || `avatar-${(username.charCodeAt(0) % 6) + 1}`;

    const user = await User.create({
      username: username.toLowerCase(),
      displayName,
      email: email.toLowerCase(),
      passwordHash,
      avatar: defaultAvatar,
      role: 'user',
    });

    // Automatically join all default public channels
    const publicChannels = await Conversation.find({ isPublicChannel: true });
    for (const channel of publicChannels) {
      await Membership.create({
        user: user._id,
        conversation: channel._id,
        role: 'member',
      });
    }

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.status(201).json({
      message: 'Account registered successfully.',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to create account.' });
  }
}

export async function login(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { identifier, password } = req.body;

    const user = await User.findOne({
      $or: [{ username: identifier.toLowerCase() }, { email: identifier.toLowerCase() }],
    });

    if (!user) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    if (user.isSuspended) {
      res.status(403).json({ error: 'This account has been suspended.' });
      return;
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash);
    if (!isMatch) {
      res.status(401).json({ error: 'Invalid username/email or password.' });
      return;
    }

    user.lastActive = new Date();
    await user.save();

    const token = generateToken(user);
    setTokenCookie(res, token);

    res.json({
      message: 'Signed in successfully.',
      token,
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to sign in.' });
  }
}

export async function logout(_req: AuthenticatedRequest, res: Response): Promise<void> {
  res.clearCookie('token', {
    httpOnly: true,
    secure: config.nodeEnv === 'production',
    sameSite: config.nodeEnv === 'production' ? 'none' : 'lax',
  });
  res.json({ message: 'Logged out successfully.' });
}

export async function getMe(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const user = await User.findById(req.user!.id).select('-passwordHash');
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    res.json({
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        role: user.role,
        preferences: user.preferences,
        lastActive: user.lastActive,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve profile.' });
  }
}

export async function updateProfile(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { displayName, avatar, statusMessage, theme, notifications } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    if (displayName) user.displayName = displayName;
    if (avatar) user.avatar = avatar;
    if (typeof statusMessage === 'string') user.statusMessage = statusMessage;
    if (theme) user.preferences.theme = theme;
    if (typeof notifications === 'boolean') user.preferences.notifications = notifications;

    await user.save();

    res.json({
      message: 'Profile updated.',
      user: {
        id: user._id,
        username: user.username,
        displayName: user.displayName,
        email: user.email,
        avatar: user.avatar,
        statusMessage: user.statusMessage,
        role: user.role,
        preferences: user.preferences,
      },
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to update profile.' });
  }
}

export async function changePassword(req: AuthenticatedRequest, res: Response): Promise<void> {
  try {
    const { currentPassword, newPassword } = req.body;
    const user = await User.findById(req.user!.id);
    if (!user) {
      res.status(404).json({ error: 'User not found.' });
      return;
    }

    const isMatch = await bcrypt.compare(currentPassword, user.passwordHash);
    if (!isMatch) {
      res.status(400).json({ error: 'Current password does not match.' });
      return;
    }

    const salt = await bcrypt.genSalt(10);
    user.passwordHash = await bcrypt.hash(newPassword, salt);
    await user.save();

    res.json({ message: 'Password changed successfully.' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to change password.' });
  }
}
