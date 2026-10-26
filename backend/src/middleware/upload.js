import multer from 'multer';
import { existsSync, mkdirSync } from 'node:fs';
import { extname, basename } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import config from '../config/index.js';

// Ensure upload directory exists
if (!existsSync(config.uploadDir)) {
  mkdirSync(config.uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, config.uploadDir);
  },
  filename: (req, file, cb) => {
    // Generate high-entropy unpredictable storage key
    const uniqueKey = `${uuidv4()}${extname(file.originalname).toLowerCase()}`;
    cb(null, uniqueKey);
  }
});

// Sanitize filename to prevent directory traversal or control characters
export function sanitizeFilename(filename) {
  return basename(filename)
    .replace(/[<>:"/\\|?*\x00-\x1F]/g, '_')
    .trim()
    .slice(0, 200);
}

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: config.maxFileSizeMB * 1024 * 1024 // 25MB
  }
});

export default uploadMiddleware;
