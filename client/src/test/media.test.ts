import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { resolveMediaUrl, isAvatarImage } from '../utils/media.js';

describe('Media Resolution Utility (media.ts)', () => {
  const originalEnv = { ...import.meta.env };

  beforeEach(() => {
    vi.restoreAllMocks();
  });

  afterEach(() => {
    // Restore env
    Object.assign(import.meta.env, originalEnv);
  });

  describe('resolveMediaUrl', () => {
    it('returns empty string for null, undefined, or empty inputs', () => {
      expect(resolveMediaUrl(null)).toBe('');
      expect(resolveMediaUrl(undefined)).toBe('');
      expect(resolveMediaUrl('')).toBe('');
      expect(resolveMediaUrl('   ')).toBe('');
    });

    it('preserves valid absolute external HTTP and HTTPS URLs', () => {
      const urlHttps = 'https://res.cloudinary.com/demo/image/upload/sample.jpg';
      const urlHttp = 'http://example.com/avatar.png';
      expect(resolveMediaUrl(urlHttps)).toBe(urlHttps);
      expect(resolveMediaUrl(urlHttp)).toBe(urlHttp);
    });

    it('preserves data URLs and blob URLs', () => {
      const dataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
      const blobUrl = 'blob:http://localhost:5173/e02c6fd1-4777-4a0f-90e6-bcf55b6ef26e';
      expect(resolveMediaUrl(dataUrl)).toBe(dataUrl);
      expect(resolveMediaUrl(blobUrl)).toBe(blobUrl);
    });

    it('resolves relative /uploads/... paths to backend origin in production (Vercel)', () => {
      // Mock window.location for Vercel production
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { ...originalLocation, hostname: 'chatterly-self.vercel.app' };

      const result = resolveMediaUrl('/uploads/1793044233083-ia60qyk.jpg');
      expect(result).toBe('https://chatterly-ql6l.onrender.com/uploads/1793044233083-ia60qyk.jpg');

      // @ts-ignore
      window.location = originalLocation;
    });

    it('handles relative paths without leading slash gracefully', () => {
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { ...originalLocation, hostname: 'chatterly-self.vercel.app' };

      const result = resolveMediaUrl('uploads/1793044233083-ia60qyk.jpg');
      expect(result).toBe('https://chatterly-ql6l.onrender.com/uploads/1793044233083-ia60qyk.jpg');

      // @ts-ignore
      window.location = originalLocation;
    });

    it('supports configured VITE_API_URL and strips trailing /api', () => {
      import.meta.env.VITE_API_URL = 'https://my-custom-backend.com/api';
      const result = resolveMediaUrl('/uploads/avatar.jpg');
      expect(result).toBe('https://my-custom-backend.com/uploads/avatar.jpg');
    });

    it('preserves relative paths in local development (localhost)', () => {
      import.meta.env.VITE_API_URL = '/api';
      const originalLocation = window.location;
      // @ts-ignore
      delete window.location;
      // @ts-ignore
      window.location = { ...originalLocation, hostname: 'localhost' };

      const result = resolveMediaUrl('/uploads/avatar.jpg');
      expect(result).toBe('/uploads/avatar.jpg');

      // @ts-ignore
      window.location = originalLocation;
    });
  });

  describe('isAvatarImage', () => {
    it('returns false for single-character initials or badges', () => {
      expect(isAvatarImage('A')).toBe(false);
      expect(isAvatarImage('M')).toBe(false);
      expect(isAvatarImage('J')).toBe(false);
      expect(isAvatarImage('7')).toBe(false);
      expect(isAvatarImage('')).toBe(false);
      expect(isAvatarImage(null)).toBe(false);
      expect(isAvatarImage(undefined)).toBe(false);
    });

    it('returns true for relative upload paths', () => {
      expect(isAvatarImage('/uploads/1793044233083-ia60qyk.jpg')).toBe(true);
      expect(isAvatarImage('uploads/avatar.png')).toBe(true);
    });

    it('returns true for absolute URLs', () => {
      expect(isAvatarImage('https://res.cloudinary.com/demo/image/upload/sample.jpg')).toBe(true);
      expect(isAvatarImage('http://example.com/user.jpeg')).toBe(true);
    });

    it('returns true for data and blob URLs', () => {
      expect(isAvatarImage('data:image/jpeg;base64,abc123==')).toBe(true);
      expect(isAvatarImage('blob:http://localhost:5173/uuid-test')).toBe(true);
    });
  });
});
