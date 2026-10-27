import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { Conversation } from '../src/models/Conversation.js';

const app = createApp();

describe('Conversation & Messaging API', () => {
  let user1Token: string;
  let user1Id: string;
  let user2Token: string;
  let user2Id: string;

  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@convtest\.com$/ } });

    const u1 = await request(app).post('/api/auth/register').send({
      username: 'convuser1',
      displayName: 'Conv User One',
      email: 'conv1@convtest.com',
      password: 'Password123!',
    });
    user1Token = u1.body.token;
    user1Id = u1.body.user.id;

    const u2 = await request(app).post('/api/auth/register').send({
      username: 'convuser2',
      displayName: 'Conv User Two',
      email: 'conv2@convtest.com',
      password: 'Password123!',
    });
    user2Token = u2.body.token;
    user2Id = u2.body.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@convtest\.com$/ } });
  });

  it('fetches existing conversations including persistent public channels', async () => {
    const res = await request(app)
      .get('/api/conversations')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(res.status).toBe(200);
    expect(Array.isArray(res.body.conversations)).toBe(true);
    const channelNames = res.body.conversations.map((c: any) => c.name);
    expect(channelNames.some((n: string) => n.toLowerCase() === 'general')).toBe(true);
    expect(channelNames.some((n: string) => n.toLowerCase() === 'developers')).toBe(true);
  });

  it('creates and deduplicates direct conversations between two users', async () => {
    // First creation
    const res1 = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipientId: user2Id });

    expect([200, 201]).toContain(res1.status);
    const convId = res1.body.conversationId;
    expect(convId).toBeDefined();

    // Second request should return the exact same conversation, preventing duplicates
    const res2 = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipientId: user2Id });

    expect(res2.status).toBe(200);
    expect(res2.body.conversationId).toBe(convId);
  });

  it('creates a private group with multiple invited members', async () => {
    const u3 = await request(app).post('/api/auth/register').send({
      username: 'convuser3',
      displayName: 'Conv User Three',
      email: 'conv3@convtest.com',
      password: 'Password123!',
    });
    const user3Id = u3.body.user.id;

    const res = await request(app)
      .post('/api/conversations/group')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        name: 'Multi Member Guild',
        description: 'Private group with multiple members.',
        memberIds: [user2Id, user3Id],
      });

    expect(res.status).toBe(201);
    expect(res.body.group.name).toBe('Multi Member Guild');
    expect(res.body.group.id).toBeDefined();
    expect(res.body.group.code).toBeDefined();

    // Verify searchUsers returns id and allows direct messaging
    const searchRes = await request(app)
      .get('/api/users/search?q=convuser3')
      .set('Authorization', `Bearer ${user1Token}`);

    expect(searchRes.status).toBe(200);
    expect(searchRes.body.users.length).toBeGreaterThan(0);
    const foundUser = searchRes.body.users[0];
    expect(foundUser.id).toBeDefined();
    expect(foundUser.id).toBe(user3Id);

    // Start DM with found user using returned id
    const dmRes = await request(app)
      .post('/api/conversations/direct')
      .set('Authorization', `Bearer ${user1Token}`)
      .send({ recipientId: foundUser.id });

    expect([200, 201]).toContain(dmRes.status);
    expect(dmRes.body.conversationId).toBeDefined();
  });

  it('sends and retrieves messages within a conversation with pagination', async () => {
    const publicGen = await Conversation.findOne({ name: { $regex: /^general$/i }, isPublicChannel: true });
    expect(publicGen).not.toBeNull();

    // Send a message
    const sendRes = await request(app)
      .post(`/api/conversations/${publicGen!._id}/messages`)
      .set('Authorization', `Bearer ${user1Token}`)
      .send({
        content: 'Hello PulseChat world!',
        idempotencyKey: 'test-key-' + Date.now(),
      });

    expect(sendRes.status).toBe(201);
    expect(sendRes.body.message.content).toBe('Hello PulseChat world!');

    // Fetch messages
    const getRes = await request(app)
      .get(`/api/conversations/${publicGen!._id}/messages?limit=10`)
      .set('Authorization', `Bearer ${user1Token}`);

    expect(getRes.status).toBe(200);
    expect(Array.isArray(getRes.body.messages)).toBe(true);
    const contents = getRes.body.messages.map((m: any) => m.content);
    expect(contents).toContain('Hello PulseChat world!');
  });
});
