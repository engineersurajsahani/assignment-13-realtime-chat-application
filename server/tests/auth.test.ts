import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import mongoose from 'mongoose';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';

const app = createApp();

describe('Authentication & User Account API', () => {
  beforeAll(async () => {
    await connectDB();
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
  });

  afterAll(async () => {
    await User.deleteMany({ email: { $regex: /@test\.com$/ } });
  });

  const testUser = {
    username: 'testpulse',
    displayName: 'Test User',
    email: 'testpulse@test.com',
    password: 'Password123!',
  };

  it('registers a new user successfully and hashes the password', async () => {
    const res = await request(app).post('/api/auth/register').send(testUser);

    expect(res.status).toBe(201);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user).toHaveProperty('id');
    expect(res.body.user.username).toBe(testUser.username);
    expect(res.body.user).not.toHaveProperty('passwordHash');

    // Verify DB stored hash, not plaintext
    const dbUser = await User.findOne({ email: testUser.email });
    expect(dbUser).not.toBeNull();
    expect(dbUser!.passwordHash).not.toBe(testUser.password);
  });

  it('rejects duplicate username registration with 409 Conflict', async () => {
    const res = await request(app).post('/api/auth/register').send({
      username: testUser.username,
      displayName: 'Duplicate User',
      email: 'another@test.com',
      password: 'Password123!',
    });

    expect(res.status).toBe(409);
    expect(res.body.error).toMatch(/username is already taken/i);
  });

  it('authenticates user with valid credentials and sets token', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('token');
    expect(res.body.user.username).toBe(testUser.username);
  });

  it('rejects invalid credentials with 401 Unauthorized', async () => {
    const res = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: 'WrongPassword!',
    });

    expect(res.status).toBe(401);
  });

  it('protects /api/auth/me against unauthenticated access', async () => {
    const res = await request(app).get('/api/auth/me');
    expect(res.status).toBe(401);
  });

  it('returns current profile when valid bearer token is provided', async () => {
    const loginRes = await request(app).post('/api/auth/login').send({
      identifier: testUser.email,
      password: testUser.password,
    });

    const token = loginRes.body.token;

    const meRes = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${token}`);

    expect(meRes.status).toBe(200);
    expect(meRes.body.user.username).toBe(testUser.username);
  });
});
