import { existsSync, unlinkSync } from 'node:fs';
import { join } from 'node:path';
import db from '../database/db.js';
import config from '../config/index.js';

let ioInstance = null;

export function setSocketIOInstance(io) {
  ioInstance = io;
}

/**
 * Runs 7-day room expiration reconciliation
 */
export async function runRoomExpirationCleanup() {
  try {
    const nowIso = new Date().toISOString();

    // 1. Find all expired rooms
    const { rows: expiredRooms } = await db.query(
      `SELECT id, name FROM rooms 
       WHERE status = 'active' AND expires_at <= $1`,
      [nowIso]
    );

    if (expiredRooms.length === 0) {
      return { cleanedCount: 0 };
    }

    console.log(`[Lifecycle Worker] Found ${expiredRooms.length} expired rooms to clean up.`);

    for (const room of expiredRooms) {
      console.log(`[Lifecycle Worker] Expiring room: ${room.id} (${room.name})`);

      // 1. Notify connected participants via Socket.IO
      if (ioInstance) {
        ioInstance.to(room.id).emit('room_expired', {
          roomId: room.id,
          message: 'This room has reached its 7-day lifetime and has expired.'
        });
      }

      // 2. Find and delete physical shared files
      const { rows: files } = await db.query(
        `SELECT storage_key FROM files WHERE room_id = $1`,
        [room.id]
      );

      for (const file of files) {
        const filePath = join(config.uploadDir, file.storage_key);
        if (existsSync(filePath)) {
          try {
            unlinkSync(filePath);
          } catch (e) {
            console.warn(`[Cleanup] Failed to unlink file ${filePath}:`, e.message);
          }
        }
      }

      // 3. Mark room as expired
      await db.query(
        `UPDATE rooms SET status = 'expired' WHERE id = $1`,
        [room.id]
      );

      // 4. Invalidate memberships and sessions
      await db.query(
        `UPDATE room_memberships SET revoked_at = datetime('now') WHERE room_id = $1`,
        [room.id]
      );
    }

    return { cleanedCount: expiredRooms.length };
  } catch (err) {
    console.error('[Lifecycle Worker Error]', err);
    return { error: err.message };
  }
}

/**
 * Starts scheduled background worker
 */
export function startCleanupWorker(io = null) {
  if (io) setSocketIOInstance(io);

  // Initial check on boot
  runRoomExpirationCleanup();

  // Run periodically
  const intervalMs = config.cleanupIntervalMinutes * 60 * 1000;
  setInterval(() => {
    runRoomExpirationCleanup();
  }, intervalMs);

  console.log(`[Lifecycle Worker] Scheduled periodic 7-day room cleanup every ${config.cleanupIntervalMinutes} minutes.`);
}

export default { runRoomExpirationCleanup, startCleanupWorker, setSocketIOInstance };
