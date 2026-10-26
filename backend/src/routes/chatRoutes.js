import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import { requireSession, requireRoomMember } from '../middleware/auth.js';

const router = express.Router({ mergeParams: true });

/**
 * Get message history for a room
 * GET /api/rooms/:roomId/messages?search=...&limit=50&before=...
 */
router.get('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { search, sender, limit = 50, before } = req.query;

    let queryText = `
      SELECT id, room_id, sender_session_id, sender_name, message_type, content, metadata, created_at
      FROM messages
      WHERE room_id = $1
    `;
    const params = [roomId];
    let pIdx = 2;

    if (search && search.trim() !== '' && search.trim() !== 'undefined' && search.trim() !== 'null') {
      queryText += ` AND content LIKE $${pIdx++}`;
      params.push(`%${search.trim()}%`);
    }

    if (sender && sender.trim() !== '' && sender.trim() !== 'undefined' && sender.trim() !== 'null') {
      queryText += ` AND sender_name LIKE $${pIdx++}`;
      params.push(`%${sender.trim()}%`);
    }

    if (before) {
      queryText += ` AND created_at < $${pIdx++}`;
      params.push(before);
    }

    queryText += ` ORDER BY created_at ASC LIMIT $${pIdx}`;
    params.push(Math.min(100, Math.max(1, parseInt(limit, 10))));

    const { rows } = await db.query(queryText, params);

    // Parse JSON metadata safely
    const parsedMessages = rows.map((m) => {
      let meta = null;
      if (m.metadata) {
        try {
          meta = JSON.parse(m.metadata);
        } catch (e) {
          meta = m.metadata;
        }
      }
      return {
        ...m,
        metadata: meta
      };
    });

    res.json({ messages: parsedMessages });
  } catch (err) {
    console.error('[Get Messages Error]', err);
    res.status(500).json({ error: 'Failed to retrieve messages.' });
  }
});

/**
 * Send a new chat message
 * POST /api/rooms/:roomId/messages
 */
router.post('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { content, messageType = 'text', metadata } = req.body;

    if (!content || content.trim().length === 0) {
      return res.status(400).json({ error: 'Message content cannot be empty.' });
    }

    const messageId = `msg_${uuidv4().slice(0, 12)}`;
    const metaStr = metadata ? JSON.stringify(metadata) : null;

    await db.query(
      `INSERT INTO messages (id, room_id, sender_session_id, sender_name, message_type, content, metadata)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [
        messageId,
        roomId,
        req.session.id,
        req.session.display_name,
        messageType,
        content.trim().slice(0, 5000),
        metaStr
      ]
    );

    const message = {
      id: messageId,
      room_id: roomId,
      sender_session_id: req.session.id,
      sender_name: req.session.display_name,
      message_type: messageType,
      content: content.trim().slice(0, 5000),
      metadata,
      created_at: new Date().toISOString()
    };

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('new_message', message);
    }

    res.status(201).json({ message });
  } catch (err) {
    console.error('[Post Message Error]', err);
    res.status(500).json({ error: 'Failed to post message.' });
  }
});

export default router;
