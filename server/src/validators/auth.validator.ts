import { z } from 'zod';

export const registerSchema = z.object({
  username: z
    .string()
    .trim()
    .min(3, 'Username must be at least 3 characters')
    .max(30, 'Username cannot exceed 30 characters')
    .regex(/^[a-zA-Z0-9_-]+$/, 'Username can only contain letters, numbers, underscores, and dashes'),
  displayName: z
    .string()
    .trim()
    .min(1, 'Display name is required')
    .max(50, 'Display name cannot exceed 50 characters'),
  email: z.string().trim().email('Invalid email address').toLowerCase(),
  password: z.string().min(6, 'Password must be at least 6 characters').max(100),
  avatar: z.string().optional(),
});

export const loginSchema = z.object({
  identifier: z.string().trim().min(1, 'Username or email is required'),
  password: z.string().min(1, 'Password is required'),
});

export const updateProfileSchema = z.object({
  displayName: z.string().trim().min(1).max(50).optional(),
  avatar: z.string().optional(),
  statusMessage: z.string().max(120).optional(),
  theme: z.enum(['light', 'dark', 'system']).optional(),
  notifications: z.boolean().optional(),
});

export const changePasswordSchema = z.object({
  currentPassword: z.string().min(1, 'Current password is required'),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').max(100),
});
