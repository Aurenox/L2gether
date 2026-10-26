import dotenv from 'dotenv';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

dotenv.config({ path: join(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:5173',
  sessionSecret: process.env.SESSION_SECRET || 'l2gether-dev-secret-super-secure-key-32chars',
  uploadDir: join(__dirname, '../../storage/uploads'),
  maxFileSizeMB: parseInt(process.env.MAX_FILE_SIZE_MB || '25', 10),
  executionTimeoutMs: parseInt(process.env.EXECUTION_TIMEOUT_MS || '10000', 10),
  maxOutputBufferBytes: parseInt(process.env.MAX_OUTPUT_BUFFER_BYTES || '65536', 10),
  roomExpiryDays: parseInt(process.env.ROOM_EXPIRY_DAYS || '7', 10),
  cleanupIntervalMinutes: parseInt(process.env.CLEANUP_INTERVAL_MINUTES || '30', 10)
};

export default config;
