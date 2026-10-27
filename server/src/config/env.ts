import path from 'path';
import dotenv from 'dotenv';

dotenv.config(); // default process.cwd()/.env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../../../.env') });

function sanitizeMongoUri(rawUri?: string): string {
  const uri = (rawUri || process.env.MONGODB_URI || process.env.MONGO_URI || '').trim();
  if (!uri) {
    return 'mongodb://127.0.0.1:27017/chatterly';
  }

  // Handle Atlas URIs missing database name or authSource
  if (uri.startsWith('mongodb+srv://')) {
    // If URI ends right after cluster domain (e.g. mongodb.net or mongodb.net/)
    const hasDbName = /^mongodb\+srv:\/\/[^/]+\/[a-zA-Z0-9_-]+/.test(uri);
    if (!hasDbName) {
      const base = uri.replace(/\/+$/, '');
      return `${base}/chatterly?retryWrites=true&w=majority&authSource=admin`;
    }
    // If it has a db name but missing authSource=admin
    if (!uri.includes('authSource=')) {
      const sep = uri.includes('?') ? '&' : '?';
      return `${uri}${sep}authSource=admin`;
    }
  }

  return uri;
}

const rawAllowed = (process.env.ALLOWED_ORIGINS || '').split(',').map((s) => s.trim()).filter(Boolean);
const clientOrigin = process.env.CLIENT_ORIGIN?.trim() || 'http://localhost:5173';
const defaultDevOrigins = ['http://localhost:5173', 'http://127.0.0.1:5173', 'http://localhost:3000', 'http://localhost:5000'];

const allowedOrigins = Array.from(new Set([
  clientOrigin,
  ...rawAllowed,
  ...defaultDevOrigins,
]));

import fs from 'fs';

function resolveUploadDir(): string {
  if (process.env.UPLOAD_DIR) {
    return path.resolve(process.cwd(), process.env.UPLOAD_DIR);
  }
  const serverUploads = path.resolve(process.cwd(), 'server', 'uploads');
  if (fs.existsSync(serverUploads)) {
    return serverUploads;
  }
  if (process.cwd().endsWith('server')) {
    return path.resolve(process.cwd(), 'uploads');
  }
  return path.resolve(process.cwd(), 'uploads');
}

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  mongoUri: sanitizeMongoUri(),
  jwtSecret: process.env.JWT_SECRET || 'chatterly_super_secure_jwt_secret_dev_key_2026',
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  clientOrigin,
  allowedOrigins,
  aiApiKey: process.env.GEMINI_API_KEY || process.env.AI_API_KEY || '',
  geminiModel: process.env.GEMINI_MODEL || 'gemini-flash-lite-latest',
  uploadDir: resolveUploadDir(),
  cloudinary: {
    cloudName: process.env.CLOUDINARY_CLOUD_NAME || '',
    apiKey: process.env.CLOUDINARY_API_KEY || '',
    apiSecret: process.env.CLOUDINARY_API_SECRET || '',
    url: process.env.CLOUDINARY_URL || '',
    isConfigured: Boolean(
      process.env.CLOUDINARY_URL ||
      (process.env.CLOUDINARY_CLOUD_NAME && process.env.CLOUDINARY_API_KEY && process.env.CLOUDINARY_API_SECRET)
    ),
  },
};
