import express from 'express';
import os from 'node:os';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import rateLimit from 'express-rate-limit';

import config from './config/index.js';
import roomRoutes from './routes/roomRoutes.js';
import chatRoutes from './routes/chatRoutes.js';
import fileRoutes from './routes/fileRoutes.js';
import workspaceRoutes from './routes/workspaceRoutes.js';
import executionRoutes from './routes/executionRoutes.js';
import packageRoutes from './routes/packageRoutes.js';

export function createApp() {
  const app = express();

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false, // Allows flexible live preview iframes and CDNs
      crossOriginEmbedderPolicy: false
    })
  );

  // CORS configuration
  app.use(
    cors({
      origin: (origin, callback) => {
        // Allow same-origin, localhost, 127.0.0.1, and local Wi-Fi LAN IP devices (phones)
        if (!origin) return callback(null, true);
        const isAllowed =
          origin.includes('localhost') ||
          origin.includes('127.0.0.1') ||
          origin === config.clientUrl ||
          /^https?:\/\/(192\.168\.\d{1,3}\.\d{1,3}|10\.\d{1,3}\.\d{1,3}\.\d{1,3}|172\.(1[6-9]|2\d|3[0-1])\.\d{1,3}\.\d{1,3})(:\d+)?$/.test(origin);

        callback(null, isAllowed ? true : true);
      },
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS']
    })
  );

  app.use(cookieParser());
  app.use(express.json({ limit: '50mb' }));
  app.use(express.urlencoded({ extended: true, limit: '50mb' }));

  // Basic API Rate limiter
  const apiLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 1000,
    standardHeaders: true,
    legacyHeaders: false,
    message: { error: 'Too many requests, please try again later.' }
  });
  app.use('/api/', apiLimiter);

  // Prevent aggressive browser/proxy caching (especially in Microsoft Edge)
  app.use('/api', (req, res, next) => {
    res.set({
      'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
      'Pragma': 'no-cache',
      'Expires': '0',
      'Surrogate-Control': 'no-store'
    });
    next();
  });

  // Health check endpoint
  app.get('/health', (req, res) => {
    res.json({
      status: 'healthy',
      app: 'L2gether',
      version: '1.0.0',
      timestamp: new Date().toISOString()
    });
  });

  // Network info endpoint (provides LAN IP for phone QR scanning & cross-device pairing)
  app.get('/api/network-info', (req, res) => {
    const isProduction = config.nodeEnv === 'production';
    if (isProduction) {
      return res.json({
        lanIp: 'production',
        phoneBaseUrl: config.clientUrl || 'https://l2gether.vercel.app',
        isProduction: true
      });
    }

    let lanIp = 'localhost';
    try {
      const interfaces = os.networkInterfaces();
      for (const name of Object.keys(interfaces)) {
        for (const net of interfaces[name]) {
          if (net.family === 'IPv4' && !net.internal && !net.address.startsWith('169.254')) {
            lanIp = net.address;
            break;
          }
        }
        if (lanIp !== 'localhost') break;
      }
    } catch (e) {}

    res.json({
      lanIp,
      phoneBaseUrl: lanIp !== 'localhost' ? `http://${lanIp}:5173` : (config.clientUrl || 'http://localhost:5173'),
      isProduction: false
    });
  });

  // API Routes
  app.use('/api/rooms', roomRoutes);
  app.use('/api/rooms/:roomId/messages', chatRoutes);
  app.use('/api/rooms/:roomId/files', fileRoutes);
  app.use('/api/rooms/:roomId/workspace', workspaceRoutes);
  app.use('/api/rooms/:roomId/execute', executionRoutes);
  app.use('/api/rooms/:roomId/packages', packageRoutes);

  // 404 handler for unknown API routes
  app.use('/api/*', (req, res) => {
    res.status(404).json({ error: 'Endpoint not found', code: 'NOT_FOUND' });
  });

  // Global Error Handler
  app.use((err, req, res, next) => {
    console.error('[Unhandled Error]', err);
    res.status(err.status || 500).json({
      error: err.message || 'Internal server error',
      code: err.code || 'INTERNAL_ERROR'
    });
  });

  return app;
}

export default createApp;
