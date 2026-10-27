import http from 'http';
import { Server as SocketIOServer } from 'socket.io';
import { createApp } from './app.js';
import { connectDB } from './config/database.js';
import { config } from './config/env.js';
import { setupSocketIO } from './sockets/index.js';
import { isOriginAllowed } from './config/cors.js';
import { logger } from './utils/logger.js';

async function bootstrap() {
  try {
    const app = createApp();
    const server = http.createServer(app);

    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          if (isOriginAllowed(origin)) {
            callback(null, true);
          } else {
            callback(null, false);
          }
        },
        credentials: true,
        methods: ['GET', 'POST'],
      },
    });

    setupSocketIO(io);

    server.listen(config.port, () => {
      logger.info(`✦ Chatterly Backend running at http://localhost:${config.port}`);
      logger.info(`✦ Health check available at http://localhost:${config.port}/api/health`);
    });

    // Connect to database with retry
    const tryConnect = async () => {
      try {
        await connectDB();
      } catch (err: any) {
        logger.warn({ err: err.message }, 'Initial MongoDB connect failed. Retrying in 3s...');
        setTimeout(tryConnect, 3000);
      }
    };
    tryConnect();

    // Graceful Shutdown
    const shutdown = () => {
      logger.info('Shutting down Chatterly server gracefully...');
      server.close(() => {
        logger.info('HTTP server closed.');
        process.exit(0);
      });
    };

    process.on('SIGTERM', shutdown);
    process.on('SIGINT', shutdown);
  } catch (error) {
    logger.error({ err: error }, 'Failed to start Chatterly server');
    process.exit(1);
  }
}

bootstrap();
