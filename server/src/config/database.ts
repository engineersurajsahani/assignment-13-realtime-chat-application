import mongoose from 'mongoose';
import { config } from './env.js';
import { logger } from '../utils/logger.js';
import { Conversation } from '../models/Conversation.js';
import { syncDiskFilesToGridFS } from '../services/storage.service.js';

export const PUBLIC_CHANNELS = [
  { name: 'General', description: 'General community discussion and catch-up.' },
  { name: 'Developers', description: 'Engineering, architecture, and code discussions.' },
  { name: 'Gaming', description: 'Gaming chat, recommendations, and streams.' },
  { name: 'Random', description: 'Casual, miscellaneous, and off-topic topics.' },
];

function maskMongoUri(uri: string): string {
  try {
    return uri.replace(/\/\/([^:]+):([^@]+)@/, '//$1:***@');
  } catch {
    return 'mongodb://***';
  }
}

let isConnected = false;
let listenersAttached = false;

export function getDatabaseStatus(): 'connected' | 'connecting' | 'disconnected' {
  const state = mongoose.connection.readyState;
  if (state === 1) return 'connected';
  if (state === 2) return 'connecting';
  return 'disconnected';
}

function ensureListeners(targetUri: string) {
  if (listenersAttached) return;
  listenersAttached = true;

  mongoose.set('strictQuery', true);

  mongoose.connection.on('connected', () => {
    isConnected = true;
    logger.info(`✦ MongoDB connection established: ${maskMongoUri(targetUri)}`);
  });

  mongoose.connection.on('disconnected', () => {
    isConnected = false;
    logger.warn('⚠️ MongoDB disconnected. Attempting automatic reconnection...');
  });

  mongoose.connection.on('error', (err) => {
    logger.error({ err: err.message }, 'MongoDB connection error encountered');
  });
}

export async function connectDB(): Promise<void> {
  if (mongoose.connection.readyState === 1) {
    return;
  }

  const primaryUri = config.mongoUri;
  const isPrimaryLocal = primaryUri.includes('127.0.0.1') || primaryUri.includes('localhost');
  const localFallbackUri = 'mongodb://127.0.0.1:27017/pulsechat';

  ensureListeners(primaryUri);

  try {
    await mongoose.connect(primaryUri, {
      serverSelectionTimeoutMS: 5000,
      retryWrites: true,
      maxPoolSize: 10,
    });
  } catch (primaryErr: any) {
    if (!isPrimaryLocal) {
      logger.warn(
        { err: primaryErr.message },
        `Primary MongoDB connect failed (${maskMongoUri(primaryUri)}). Attempting local fallback (${localFallbackUri})...`
      );
      try {
        await mongoose.connect(localFallbackUri, {
          serverSelectionTimeoutMS: 4000,
          retryWrites: true,
          maxPoolSize: 10,
        });
        logger.info(`✦ Connected to local fallback MongoDB: ${localFallbackUri}`);
      } catch (fallbackErr: any) {
        logger.error(
          { err: fallbackErr.message },
          `Local fallback connect also failed (${localFallbackUri})`
        );
        throw primaryErr;
      }
    } else {
      logger.error({ err: primaryErr.message }, `Failed to connect to MongoDB (${maskMongoUri(primaryUri)})`);
      throw primaryErr;
    }
  }

  // Ensure public channels exist with proper Capitalization (Section 7)
  for (const channel of PUBLIC_CHANNELS) {
    try {
      const exists = await Conversation.findOne({
        name: { $regex: new RegExp(`^${channel.name}$`, 'i') },
        isPublicChannel: true,
      });

      if (!exists) {
        await Conversation.create({
          type: 'channel',
          name: channel.name,
          description: channel.description,
          isPublicChannel: true,
          code: channel.name.toUpperCase(),
        });
        logger.info(`✦ Initialized persistent public channel: #${channel.name}`);
      } else if (exists.name !== channel.name) {
        exists.name = channel.name;
        exists.code = channel.name.toUpperCase();
        await exists.save();
        logger.info(`✦ Updated channel capitalization to #${channel.name}`);
      }
    } catch (e: any) {
      logger.warn({ err: e.message }, `Channel check for #${channel.name} encountered an issue`);
    }
  }

  // Automatically sync any existing local disk uploads into persistent MongoDB GridFS
  try {
    await syncDiskFilesToGridFS();
  } catch (syncErr: any) {
    logger.warn({ err: syncErr.message }, 'Initial GridFS disk sync encountered an issue');
  }
}
