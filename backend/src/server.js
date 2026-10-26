import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import config from './config/index.js';
import { initDatabase } from './database/db.js';
import { createApp } from './app.js';
import { setupSockets } from './sockets/index.js';
import { startCleanupWorker } from './workers/cleanupWorker.js';

async function bootstrap() {
  try {
    console.log('[L2gether] Initializing server...');

    // 1. Initialize Database (Postgres or embedded SQLite fallback)
    await initDatabase();

    // 2. Setup Express App
    const app = createApp();
    const server = http.createServer(app);

    // 3. Setup Socket.IO
    const io = new SocketIOServer(server, {
      cors: {
        origin: (origin, callback) => {
          // Allow connection from phone on local Wi-Fi, localhost, and configured clients
          callback(null, true);
        },
        credentials: true,
        methods: ['GET', 'POST']
      },
      pingTimeout: 30000,
      pingInterval: 15000
    });

    app.set('io', io);
    setupSockets(io);

    // 4. Start 7-day Room Lifecycle Cleanup Worker
    startCleanupWorker(io);

    // 5. Start listening
    server.listen(config.port, () => {
      console.log(`====================================================`);
      console.log(`🚀 L2gether Backend running on http://localhost:${config.port}`);
      console.log(`   Health Check: http://localhost:${config.port}/health`);
      console.log(`   Client URL:   ${config.clientUrl}`);
      console.log(`   Room Expiry:  ${config.roomExpiryDays} days policy`);
      console.log(`====================================================`);
    });

    // Graceful shutdown
    const shutdown = () => {
      console.log('[L2gether] Graceful shutdown initiated...');
      server.close(() => {
        console.log('[L2gether] Server closed.');
        process.exit(0);
      });
    };

    process.on('SIGINT', shutdown);
    process.on('SIGTERM', shutdown);
  } catch (err) {
    console.error('[L2gether Bootstrap Error]', err);
    process.exit(1);
  }
}

bootstrap();
