import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream';
import { promisify } from 'util';
import mongoose from 'mongoose';
import { v2 as cloudinary } from 'cloudinary';
import { Request, Response } from 'express';
import { config } from '../config/env.js';
import { logger } from '../utils/logger.js';
import { User } from '../models/User.js';

const streamPipeline = promisify(pipeline);

// Initialize Cloudinary if configured via environment variables
if (config.cloudinary?.isConfigured) {
  if (config.cloudinary.url) {
    cloudinary.config({ url: config.cloudinary.url });
  } else {
    cloudinary.config({
      cloud_name: config.cloudinary.cloudName,
      api_key: config.cloudinary.apiKey,
      api_secret: config.cloudinary.apiSecret,
      secure: true,
    });
  }
  logger.info('✦ Storage service initialized with Cloudinary persistent object storage');
} else {
  logger.info(`✦ Storage service initialized with MongoDB GridFS persistent storage + local disk cache (${config.uploadDir})`);
}

export interface StoredFileResult {
  url: string;
  storageType: 'cloudinary' | 'gridfs' | 'local';
  publicId?: string;
}

let cachedBucket: mongoose.mongo.GridFSBucket | null = null;

/**
 * Returns the GridFS bucket instance tied to the active MongoDB connection.
 */
export function getGridFSBucket(): mongoose.mongo.GridFSBucket | null {
  if (mongoose.connection.readyState !== 1 || !mongoose.connection.db) {
    return null;
  }
  if (!cachedBucket || (cachedBucket as any).s?.db !== mongoose.connection.db) {
    cachedBucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, {
      bucketName: 'uploads',
    });
  }
  return cachedBucket;
}

/**
 * Determines MIME type from a filename extension.
 */
export function getMimeType(filename: string): string {
  const ext = path.extname(filename).toLowerCase();
  const mimeMap: Record<string, string> = {
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.png': 'image/png',
    '.webp': 'image/webp',
    '.gif': 'image/gif',
    '.svg': 'image/svg+xml',
    '.avif': 'image/avif',
    '.pdf': 'application/pdf',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.ogg': 'audio/ogg',
    '.mp4': 'video/mp4',
    '.txt': 'text/plain',
    '.json': 'application/json',
  };
  return mimeMap[ext] || 'application/octet-stream';
}

/**
 * Ensures the configured upload directory exists on disk.
 */
export function ensureUploadDirExists(): string {
  const dir = config.uploadDir;
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

/**
 * Persists a file into MongoDB GridFS.
 */
export async function saveFileToGridFS(
  filePath: string,
  filename: string,
  mimeType?: string,
  metadata?: Record<string, any>
): Promise<boolean> {
  const bucket = getGridFSBucket();
  if (!bucket || !fs.existsSync(filePath)) {
    return false;
  }

  try {
    const safeFilename = path.basename(filename);
    const contentType = mimeType || getMimeType(safeFilename);

    // Delete existing chunks if a file with the same filename was previously registered
    const existing = await bucket.find({ filename: safeFilename }).toArray();
    for (const file of existing) {
      await bucket.delete(file._id);
    }

    const readStream = fs.createReadStream(filePath);
    const uploadStream = bucket.openUploadStream(safeFilename, {
      contentType,
      metadata: {
        ...metadata,
        originalFilename: safeFilename,
        uploadedAt: new Date(),
      },
    });

    await streamPipeline(readStream, uploadStream);
    logger.info(`✦ Saved file to persistent MongoDB GridFS: ${safeFilename}`);
    return true;
  } catch (err: any) {
    logger.error({ err: err.message, filename }, 'Failed to save file to MongoDB GridFS');
    return false;
  }
}

/**
 * Saves an uploaded avatar image.
 * Always persists into MongoDB GridFS so it survives ephemeral restarts on Render.
 * If Cloudinary is configured, also uploads to Cloudinary.
 */
export async function saveAvatar(file: Express.Multer.File): Promise<StoredFileResult> {
  // Persist into MongoDB GridFS for permanent durability across restarts
  await saveFileToGridFS(file.path, file.filename, file.mimetype, { type: 'avatar' });

  if (config.cloudinary?.isConfigured) {
    try {
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'chatterly/avatars',
        transformation: [{ width: 256, height: 256, crop: 'fill', gravity: 'face' }],
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        storageType: 'cloudinary',
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to upload avatar to Cloudinary, using persistent GridFS');
    }
  }

  return {
    url: `/uploads/${file.filename}`,
    storageType: 'gridfs',
  };
}

/**
 * Saves an uploaded attachment (chat image, document, audio, video).
 * Always persists into MongoDB GridFS so it survives ephemeral restarts on Render.
 * If Cloudinary is configured, also uploads to Cloudinary.
 */
export async function saveAttachment(file: Express.Multer.File): Promise<StoredFileResult> {
  // Persist into MongoDB GridFS for permanent durability across restarts
  await saveFileToGridFS(file.path, file.filename, file.mimetype, {
    type: 'attachment',
    originalName: file.originalname,
  });

  if (config.cloudinary?.isConfigured) {
    try {
      const isImage = file.mimetype.startsWith('image/');
      const result = await cloudinary.uploader.upload(file.path, {
        folder: 'chatterly/attachments',
        resource_type: isImage ? 'image' : 'raw',
      });

      return {
        url: result.secure_url,
        publicId: result.public_id,
        storageType: 'cloudinary',
      };
    } catch (err: any) {
      logger.error({ err: err.message }, 'Failed to upload attachment to Cloudinary, using persistent GridFS');
    }
  }

  return {
    url: `/uploads/${file.filename}`,
    storageType: 'gridfs',
  };
}

/**
 * Streams media directly from MongoDB GridFS with caching and CORS headers.
 * If the file is found, also writes to the local disk cache for fast repeat access.
 */
export async function serveMediaFromGridFS(
  filename: string,
  req: Request,
  res: Response
): Promise<boolean> {
  const safeFilename = path.basename(filename);
  const bucket = getGridFSBucket();
  if (!bucket) return false;

  try {
    const files = await bucket.find({ filename: safeFilename }).limit(1).toArray();
    if (!files || files.length === 0) {
      return false;
    }

    const file = files[0];
    const etag = `"${file._id.toString()}"`;

    // Support conditional HTTP caching
    if (req.headers['if-none-match'] === etag) {
      res.status(304).end();
      return true;
    }

    const contentType = file.contentType || getMimeType(safeFilename);

    res.setHeader('Content-Type', contentType);
    res.setHeader('Content-Length', file.length);
    res.setHeader('ETag', etag);
    res.setHeader('Cache-Control', 'public, max-age=31536000, immutable');
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');

    const downloadStream = bucket.openDownloadStreamByName(safeFilename);
    downloadStream.pipe(res);

    // Warm up local disk cache asynchronously in the background
    const localDir = config.uploadDir;
    if (fs.existsSync(localDir)) {
      const localPath = path.resolve(localDir, safeFilename);
      if (!fs.existsSync(localPath)) {
        const diskWriteStream = fs.createWriteStream(localPath);
        bucket.openDownloadStreamByName(safeFilename).pipe(diskWriteStream).on('error', () => {});
      }
    }

    return true;
  } catch (err: any) {
    logger.error({ err: err.message, filename: safeFilename }, 'Failed to stream media from GridFS');
    return false;
  }
}

/**
 * Scans the local upload directory and ensures all existing files are
 * uploaded to MongoDB GridFS. Idempotent and safe to run on every startup.
 */
export async function syncDiskFilesToGridFS(): Promise<number> {
  const bucket = getGridFSBucket();
  if (!bucket) return 0;
  const dir = config.uploadDir;
  if (!fs.existsSync(dir)) return 0;

  try {
    const filenames = fs.readdirSync(dir);
    let synced = 0;

    for (const filename of filenames) {
      if (filename.startsWith('.')) continue;

      const fullPath = path.resolve(dir, filename);
      try {
        const stat = fs.statSync(fullPath);
        if (!stat.isFile()) continue;

        const existing = await bucket.find({ filename }).limit(1).toArray();
        if (existing.length === 0) {
          await saveFileToGridFS(fullPath, filename, getMimeType(filename), { source: 'disk-sync' });
          synced++;
        }
      } catch (fileErr: any) {
        logger.warn({ err: fileErr.message, filename }, 'Skipping file during sync');
      }
    }

    if (synced > 0) {
      logger.info(`✦ Successfully synced ${synced} file(s) from disk into MongoDB GridFS`);
    }
    return synced;
  } catch (err: any) {
    logger.warn({ err: err.message }, 'Failed during syncDiskFilesToGridFS');
    return 0;
  }
}

/**
 * Cleans up an old avatar file when a user replaces or removes their avatar.
 * Guarantees:
 * 1. Checks if any other user references the same avatar before deleting.
 * 2. Safely deletes Cloudinary images or GridFS/disk files without path traversal.
 * 3. Never deletes single-letter avatars or external third-party URLs.
 */
export async function cleanupOldAvatar(oldAvatarUrl?: string | null, currentUserId?: string): Promise<void> {
  if (!oldAvatarUrl || typeof oldAvatarUrl !== 'string') return;
  const trimmed = oldAvatarUrl.trim();
  if (!trimmed || trimmed.length <= 3) return; // e.g. initial letters 'A', 'M'

  // Safety check: verify no other user references this exact avatar
  if (currentUserId) {
    try {
      const isReferenced = await User.exists({
        _id: { $ne: currentUserId },
        avatar: trimmed,
      });
      if (isReferenced) {
        logger.info(`Old avatar is still referenced by another user; preserving file: ${trimmed}`);
        return;
      }
    } catch {
      // If DB check fails, err on the side of caution and do not delete
      return;
    }
  }

  // If stored in Cloudinary
  if (trimmed.includes('cloudinary.com') && config.cloudinary?.isConfigured) {
    try {
      const matches = trimmed.match(/\/v\d+\/(chatterly\/[^\.]+)/);
      if (matches && matches[1]) {
        await cloudinary.uploader.destroy(matches[1]);
        logger.info(`Destroyed previous Cloudinary avatar: ${matches[1]}`);
      }
    } catch (err: any) {
      logger.warn({ err: err.message }, 'Could not destroy old Cloudinary avatar');
    }
    return;
  }

  // If stored in GridFS / local disk (/uploads/<filename>)
  if (trimmed.startsWith('/uploads/') || trimmed.startsWith('uploads/')) {
    const filename = path.basename(trimmed);

    // Delete from MongoDB GridFS
    const bucket = getGridFSBucket();
    if (bucket) {
      try {
        const files = await bucket.find({ filename }).toArray();
        for (const f of files) {
          await bucket.delete(f._id);
        }
        logger.info(`Deleted old avatar from GridFS: ${filename}`);
      } catch (err: any) {
        logger.warn({ err: err.message }, `Failed to delete from GridFS: ${filename}`);
      }
    }

    // Delete from local disk cache
    const targetPath = path.resolve(config.uploadDir, filename);
    if (targetPath.startsWith(config.uploadDir) && fs.existsSync(targetPath)) {
      try {
        fs.unlinkSync(targetPath);
        logger.info(`Cleaned up previous local avatar: ${filename}`);
      } catch (err: any) {
        logger.warn({ err: err.message }, `Failed to delete local avatar file: ${targetPath}`);
      }
    }
  }
}

/**
 * Helper to safely delete an uploaded file from disk if processing fails.
 */
export function safelyRemoveFile(filePath?: string): void {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Ignore cleanup error
  }
}
