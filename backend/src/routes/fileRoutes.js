import express from 'express';
import { existsSync, unlinkSync, createReadStream } from 'node:fs';
import { join } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import config from '../config/index.js';
import { requireSession, requireRoomMember } from '../middleware/auth.js';
import { uploadMiddleware, sanitizeFilename } from '../middleware/upload.js';

const router = express.Router({ mergeParams: true });

/**
 * List files for a room
 * GET /api/rooms/:roomId/files
 */
router.get('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { rows } = await db.query(
      `SELECT id, room_id, uploaded_by_session_id, uploaded_by_name, 
              original_filename, size_bytes, mime_type, created_at
       FROM files 
       WHERE room_id = $1 
       ORDER BY created_at DESC`,
      [roomId]
    );

    res.json({ files: rows });
  } catch (err) {
    console.error('[List Files Error]', err);
    res.status(500).json({ error: 'Failed to retrieve shared files.' });
  }
});

/**
 * Upload a file to room
 * POST /api/rooms/:roomId/files/upload
 */
router.post('/upload', requireSession, requireRoomMember, uploadMiddleware.single('file'), async (req, res) => {
  try {
    const { roomId } = req.params;
    const file = req.file;

    if (!file) {
      return res.status(400).json({ error: 'No file provided for upload.' });
    }

    const cleanFilename = sanitizeFilename(file.originalname);
    const fileId = `file_${uuidv4().slice(0, 12)}`;

    await db.query(
      `INSERT INTO files (id, room_id, uploaded_by_session_id, uploaded_by_name, original_filename, storage_key, mime_type, size_bytes)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
      [
        fileId,
        roomId,
        req.session.id,
        req.session.display_name,
        cleanFilename,
        file.filename,
        file.mimetype || 'application/octet-stream',
        file.size
      ]
    );

    // Also insert a notification message into chat so participants see the new file
    const msgId = `msg_${uuidv4().slice(0, 12)}`;
    await db.query(
      `INSERT INTO messages (id, room_id, sender_session_id, sender_name, message_type, content, metadata)
       VALUES ($1, $2, $3, $4, 'file', $5, $6)`,
      [
        msgId,
        roomId,
        req.session.id,
        req.session.display_name,
        `Shared file: ${cleanFilename}`,
        JSON.stringify({ fileId, filename: cleanFilename, sizeBytes: file.size, mimeType: file.mimetype })
      ]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new_message', {
        id: msgId,
        room_id: roomId,
        sender_session_id: req.session.id,
        sender_name: req.session.display_name,
        message_type: 'file',
        content: `Shared file: ${cleanFilename}`,
        metadata: { fileId, filename: cleanFilename, sizeBytes: file.size, mimeType: file.mimetype },
        created_at: new Date().toISOString()
      });
    }

    res.status(201).json({
      file: {
        id: fileId,
        room_id: roomId,
        original_filename: cleanFilename,
        size_bytes: file.size,
        mime_type: file.mimetype,
        uploaded_by_name: req.session.display_name,
        created_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Upload File Error]', err);
    res.status(500).json({ error: 'File upload failed: ' + err.message });
  }
});

/**
 * Download a shared file
 * GET /api/rooms/:roomId/files/:fileId/download
 */
router.get('/:fileId/download', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId, fileId } = req.params;

    const { rows } = await db.query(
      `SELECT original_filename, storage_key, mime_type, size_bytes 
       FROM files 
       WHERE id = $1 AND room_id = $2`,
      [fileId, roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const file = rows[0];
    const physicalPath = join(config.uploadDir, file.storage_key);

    if (!existsSync(physicalPath)) {
      return res.status(404).json({ error: 'File data is missing from server storage.' });
    }

    // Set secure download headers
    res.setHeader('Content-Disposition', `attachment; filename="${encodeURIComponent(file.original_filename)}"`);
    res.setHeader('Content-Type', file.mime_type || 'application/octet-stream');
    res.setHeader('Content-Length', file.size_bytes);

    const stream = createReadStream(physicalPath);
    stream.pipe(res);
  } catch (err) {
    console.error('[Download File Error]', err);
    res.status(500).json({ error: 'Failed to download file.' });
  }
});

/**
 * Delete a file (uploader or owner)
 * DELETE /api/rooms/:roomId/files/:fileId
 */
router.delete('/:fileId', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId, fileId } = req.params;

    const { rows } = await db.query(
      `SELECT storage_key, uploaded_by_session_id FROM files WHERE id = $1 AND room_id = $2`,
      [fileId, roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'File not found.' });
    }

    const file = rows[0];
    if (file.uploaded_by_session_id !== req.session.id && !req.isOwner) {
      return res.status(403).json({ error: 'Permission denied. Only uploader or room owner can delete this file.' });
    }

    // Delete from disk
    const physicalPath = join(config.uploadDir, file.storage_key);
    if (existsSync(physicalPath)) {
      try { unlinkSync(physicalPath); } catch (e) {}
    }

    await db.query(`DELETE FROM files WHERE id = $1`, [fileId]);

    res.json({ success: true, message: 'File deleted.' });
  } catch (err) {
    console.error('[Delete File Error]', err);
    res.status(500).json({ error: 'Failed to delete file.' });
  }
});

export default router;
