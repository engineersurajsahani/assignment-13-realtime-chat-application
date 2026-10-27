import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';
import { Message } from '../src/models/Message.js';

describe('PulseChat v2 Feature Endpoints', () => {
  const app = createApp();
  let userToken: string;
  let userId: string;
  let testChannelId: string;

  beforeAll(async () => {
    await connectDB();

    const unique = Date.now();
    const userRes = await request(app).post('/api/auth/register').send({
      username: `feature_user_${unique}`,
      displayName: 'Feature Tester',
      email: `feat_${unique}@example.com`,
      password: 'password123',
    });

    userToken = userRes.body.token;
    userId = userRes.body.user.id;

    // Fetch existing public channels
    const convRes = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${userToken}`);

    const generalChannel = convRes.body.conversations?.find((c: any) => c.name === 'general') || convRes.body.conversations?.[0];
    testChannelId = generalChannel ? (generalChannel.id || generalChannel._id) : '';

    // Seed messages with links and text
    await request(app)
      .post(`/api/conversations/${testChannelId}/messages`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        content: 'Check out the documentation at https://github.com/juitawde/realtime-chat-app and https://vitejs.dev',
        idempotencyKey: `msg-seed-1-${unique}`,
      });
  });

  afterAll(async () => {
    if (userId) {
      await User.findByIdAndDelete(userId);
    }
  });

  describe('Chatterly AI Chat API', () => {
    it('POST /api/ai/chat should return an intelligent response with engine info', async () => {
      const res = await request(app)
        .post('/api/ai/chat')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          message: 'How do WebSockets work in real-time chat?',
          history: [],
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('reply');
      expect(res.body).toHaveProperty('engine');
      expect(typeof res.body.reply).toBe('string');
      expect(res.body.reply.length).toBeGreaterThan(10);
    }, 45000);

    it('POST /api/ai/summarize should support scope selection and structured output', async () => {
      const res = await request(app)
        .post('/api/ai/summarize')
        .set('Authorization', `Bearer ${userToken}`)
        .send({
          conversationId: testChannelId,
          scope: 'last-50',
        });

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('overview');
      expect(res.body).toHaveProperty('keyTopics');
      expect(res.body).toHaveProperty('decisions');
      expect(res.body).toHaveProperty('actionItems');
      expect(res.body).toHaveProperty('messageCount');
    });
  });

  describe('Conversation Media, Links & Docs API', () => {
    it('GET /api/conversations/:id/media should return media items array', async () => {
      const res = await request(app)
        .get(`/api/conversations/${testChannelId}/media`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('media');
      expect(Array.isArray(res.body.media)).toBe(true);
    });

    it('GET /api/conversations/:id/links should extract links from conversation messages', async () => {
      const res = await request(app)
        .get(`/api/conversations/${testChannelId}/links`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('links');
      expect(Array.isArray(res.body.links)).toBe(true);
      expect(res.body.links.length).toBeGreaterThan(0);
      expect(res.body.links[0]).toHaveProperty('domain');
      expect(res.body.links[0]).toHaveProperty('url');
    });

    it('GET /api/conversations/:id/docs should return documents array', async () => {
      const res = await request(app)
        .get(`/api/conversations/${testChannelId}/docs`)
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body).toHaveProperty('docs');
      expect(Array.isArray(res.body.docs)).toBe(true);
    });
  });

  describe('User Avatar API', () => {
    it('DELETE /api/users/avatar should clear avatar and return default initial', async () => {
      const res = await request(app)
        .delete('/api/users/avatar')
        .set('Authorization', `Bearer ${userToken}`);

      expect(res.status).toBe(200);
      expect(res.body.user.avatar).toBe('');
    });
  });
});
