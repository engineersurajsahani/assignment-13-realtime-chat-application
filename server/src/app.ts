import express, { Express } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

import { config } from './config/env.js';
import { corsOptions } from './config/cors.js';
import { getDatabaseStatus } from './config/database.js';
import { errorHandler } from './middleware/error.middleware.js';
import { serveMediaFromGridFS } from './services/storage.service.js';

import authRoutes from './routes/auth.routes.js';
import conversationRoutes from './routes/conversation.routes.js';
import messageRoutes from './routes/message.routes.js';
import userRoutes from './routes/user.routes.js';
import notificationRoutes from './routes/notification.routes.js';
import moderationRoutes from './routes/moderation.routes.js';
import aiRoutes from './routes/ai.routes.js';

export function createApp(): Express {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginResourcePolicy: { policy: 'cross-origin' },
    })
  );

  // CORS Configuration
  app.use(cors(corsOptions));

  // Parsers
  app.use(express.json({ limit: '10mb' }));
  app.use(express.urlencoded({ extended: true, limit: '10mb' }));
  app.use(cookieParser());

  // Static uploads directory with MongoDB GridFS persistent fallback
  const uploadsPath = path.resolve(process.cwd(), config.uploadDir);
  if (!fs.existsSync(uploadsPath)) {
    fs.mkdirSync(uploadsPath, { recursive: true });
  }

  const handleMediaFallback = async (req: express.Request, res: express.Response, next: express.NextFunction) => {
    const rawParam = req.params.filename;
    const filename = (Array.isArray(rawParam) ? rawParam[0] : rawParam) || req.path.replace(/^\/+/, '');
    if (!filename || typeof filename !== 'string') return next();
    const served = await serveMediaFromGridFS(filename, req, res);
    if (!served) {
      res.status(404).json({ error: 'Media file not found' });
    }
  };

  app.use(
    '/uploads',
    express.static(uploadsPath, {
      maxAge: '7d',
      setHeaders: (res) => {
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
      },
    }),
    handleMediaFallback
  );

  app.get('/api/media/:filename', handleMediaFallback);
  app.get('/api/uploads/:filename', handleMediaFallback);

  // Rate Limiting on Authentication
  const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 100,
    message: { error: 'Too many requests from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use('/api/auth/login', authLimiter);
  app.use('/api/auth/register', authLimiter);

  // Health Check with Database Readiness (Section 3)
  app.get('/api/health', (_req, res) => {
    const dbStatus = getDatabaseStatus();
    res.json({
      ok: dbStatus === 'connected',
      service: 'chatterly-backend',
      version: '2.0.0',
      database: dbStatus,
      uptime: process.uptime(),
      timestamp: new Date().toISOString(),
    });
  });

  // API Routes
  app.use('/api/auth', authRoutes);
  app.use('/api/conversations', conversationRoutes);
  app.use('/api', messageRoutes);
  app.use('/api/users', userRoutes);
  app.use('/api/notifications', notificationRoutes);
  app.use('/api/moderation', moderationRoutes);
  app.use('/api/ai', aiRoutes);

  // Centralized Error Handling
  app.use(errorHandler);

  return app;
}
