import { z } from 'zod';

export const createGroupSchema = z.object({
  name: z.string().trim().min(1, 'Group name is required').max(60, 'Group name cannot exceed 60 characters'),
  description: z.string().trim().max(250).optional(),
  memberIds: z.array(z.string()).optional(),
});

export const joinGroupSchema = z.object({
  code: z.string().trim().min(3).max(20).toUpperCase(),
});

export const sendMessageSchema = z.object({
  content: z.string().max(5000).default(''),
  type: z.enum(['text', 'image', 'file', 'audio', 'system']).default('text'),
  replyTo: z.string().optional(),
  idempotencyKey: z.string().optional(),
  attachments: z
    .array(
      z.object({
        name: z.string(),
        url: z.string(),
        size: z.number(),
        mimeType: z.string(),
      })
    )
    .optional(),
});

export const editMessageSchema = z.object({
  content: z.string().trim().min(1, 'Content cannot be empty').max(5000),
});

export const addReactionSchema = z.object({
  emoji: z.string().trim().min(1).max(16),
});

export const reportSchema = z.object({
  targetType: z.enum(['user', 'message']),
  targetId: z.string().min(1),
  reason: z.string().trim().min(5).max(1000),
});
