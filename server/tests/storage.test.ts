import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import request from 'supertest';
import fs from 'fs';
import path from 'path';
import { createApp } from '../src/app.js';
import { connectDB } from '../src/config/database.js';
import { User } from '../src/models/User.js';
import { config } from '../src/config/env.js';
import { ensureUploadDirExists } from '../src/services/storage.service.js';

const app = createApp();

describe('Storage & Profile Image Management API', () => {
  let authToken = '';
  let userId = '';
  const testEmail = 'storage_test_user@test.com';
  const dummyImagePath = path.resolve(config.uploadDir, 'dummy_test_avatar.jpg');

  beforeAll(async () => {
    await connectDB();
    ensureUploadDirExists();

    // Create a 1x1 dummy test image buffer
    const dummyBuffer = Buffer.from([
      0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01,
      0x01, 0x01, 0x00, 0x48, 0x00, 0x48, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43,
      0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08, 0x07, 0x07, 0x07, 0x09,
      0xff, 0xd9,
    ]);
    fs.writeFileSync(dummyImagePath, dummyBuffer);

    await User.deleteMany({ email: testEmail });

    // Register user to obtain token
    const res = await request(app).post('/api/auth/register').send({
      username: 'storagetester',
      displayName: 'Storage Tester',
      email: testEmail,
      password: 'Password123!',
    });
    authToken = res.body.token;
    userId = res.body.user.id;
  });

  afterAll(async () => {
    await User.deleteMany({ email: testEmail });
    if (fs.existsSync(dummyImagePath)) {
      fs.unlinkSync(dummyImagePath);
    }
  });

  it('rejects avatar upload without file', async () => {
    const res = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(400);
    expect(res.body.error).toBe('Please select an image file to upload.');
  });

  it('uploads a profile image successfully and updates user avatar with canonical URL', async () => {
    const res = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('avatar', dummyImagePath);

    expect(res.status).toBe(200);
    expect(res.body).toHaveProperty('avatarUrl');
    expect(res.body.avatarUrl).toMatch(/^(\/uploads\/|https:\/\/)/);
    expect(res.body.user.avatar).toBe(res.body.avatarUrl);

    // Verify DB record
    const updatedUser = await User.findById(userId);
    expect(updatedUser?.avatar).toBe(res.body.avatarUrl);
  });

  it('replaces an existing avatar and cleans up previous file safely', async () => {
    // 1. First upload
    const res1 = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('avatar', dummyImagePath);
    const firstAvatar = res1.body.avatarUrl;

    // 2. Second upload (replacement)
    const res2 = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('avatar', dummyImagePath);
    const secondAvatar = res2.body.avatarUrl;

    expect(res2.status).toBe(200);
    expect(secondAvatar).not.toBe(firstAvatar);

    // Verify first avatar file on local disk was cleaned up if it was a local /uploads/ file
    if (firstAvatar.startsWith('/uploads/')) {
      const oldFilename = path.basename(firstAvatar);
      const oldPath = path.resolve(config.uploadDir, oldFilename);
      expect(fs.existsSync(oldPath)).toBe(false);
    }
  });

  it('removes avatar and reverts to initial without breaking', async () => {
    const res = await request(app)
      .delete('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`);

    expect(res.status).toBe(200);
    expect(res.body.user.avatar).toBe('');

    const dbUser = await User.findById(userId);
    expect(dbUser?.avatar).toBe('');
  });

  it('persists uploaded image in GridFS and serves it with 200 even after local disk file is wiped', async () => {
    // 1. Upload a new avatar
    const res = await request(app)
      .post('/api/users/avatar')
      .set('Authorization', `Bearer ${authToken}`)
      .attach('avatar', dummyImagePath);

    expect(res.status).toBe(200);
    const avatarUrl = res.body.avatarUrl;
    expect(avatarUrl).toMatch(/^\/uploads\//);

    const filename = path.basename(avatarUrl);
    const localDiskPath = path.resolve(config.uploadDir, filename);

    // 2. SIMULATE RENDER EPHEMERAL WIPE: Delete the file from local disk
    if (fs.existsSync(localDiskPath)) {
      fs.unlinkSync(localDiskPath);
    }
    expect(fs.existsSync(localDiskPath)).toBe(false);

    // 3. Request the image via GET /uploads/:filename
    const fetchRes = await request(app).get(`/uploads/${filename}`);
    expect(fetchRes.status).toBe(200);
    expect(fetchRes.headers['content-type']).toMatch(/image\/(jpeg|jpg)/);
    expect(fetchRes.headers['cache-control']).toBe('public, max-age=31536000, immutable');
    expect(fetchRes.body.length).toBeGreaterThan(0);
  });
});
