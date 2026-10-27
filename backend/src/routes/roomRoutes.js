import express from 'express';
import rateLimit from 'express-rate-limit';
import db from '../database/db.js';
import { requireSession, requireRoomMember, requireRoomOwner } from '../middleware/auth.js';
import {
  createGuestSession,
  createRoom,
  getRoomDetails,
  joinRoom,
  getRoomParticipants,
  getPendingJoinRequests,
  authenticateOwner,
  setRoomEditingLock
} from '../services/roomService.js';

const router = express.Router();

const hostLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // limit to 20 attempts per 15 min window
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many host authentication attempts. Please try again later.', code: 'RATE_LIMITED' }
});

/**
 * Register or refresh a guest session
 * POST /api/rooms/guest-session
 */
router.post('/guest-session', async (req, res) => {
  try {
    const { displayName } = req.body;
    if (!displayName || displayName.trim().length === 0) {
      return res.status(400).json({ error: 'Display name is required.' });
    }
    const session = await createGuestSession(displayName);

    // Set HttpOnly cookie for session token
    res.cookie('l2gether_session', session.token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000 // 7 days
    });

    res.json(session);
  } catch (err) {
    console.error('[Guest Session Error]', err);
    res.status(500).json({ error: 'Failed to create guest session.' });
  }
});

/**
 * Authenticate returning room creator / owner using password or recovery key
 * POST /api/rooms/manage/login
 */
router.post('/manage/login', hostLoginLimiter, async (req, res) => {
  try {
    const { roomId, password, recoveryKey, displayName } = req.body;
    if (!roomId || (!password && !recoveryKey)) {
      return res.status(400).json({ error: 'Room ID and owner password or recovery key are required.' });
    }

    let session = null;
    let token = null;
    const rawToken = req.headers['x-session-token'] || req.cookies?.l2gether_session;

    if (rawToken) {
      const { hashToken } = await import('../middleware/auth.js');
      const hash = hashToken(rawToken);
      const sRes = await db.query(
        `SELECT id, display_name FROM guest_sessions WHERE session_token_hash = $1`,
        [hash]
      );
      if (sRes.rows.length > 0) {
        session = sRes.rows[0];
        token = rawToken;
      }
    }

    if (!session) {
      const hostName = (displayName || 'Host').trim();
      const newSess = await createGuestSession(hostName);
      session = { id: newSess.sessionId, display_name: newSess.displayName };
      token = newSess.token;
    }

    let effPassword = password ? password.trim() : null;
    let effRecoveryKey = recoveryKey ? recoveryKey.trim() : null;

    // If recoveryKey not provided explicitly, but input starts with L2G- (or matches recovery key format):
    if (effPassword && (effPassword.toUpperCase().startsWith('L2G-') || /^[A-Z0-9]{4}-[A-Z0-9]{4}/i.test(effPassword)) && !effRecoveryKey) {
      effRecoveryKey = effPassword.toUpperCase();
      effPassword = null;
    }

    const authResult = await authenticateOwner({
      roomId: roomId.trim(),
      password: effPassword,
      recoveryKey: effRecoveryKey,
      sessionId: session.id
    });

    if (!authResult.success) {
      return res.status(authResult.code === 'ROOM_NOT_FOUND' ? 404 : 401).json(authResult);
    }

    res.cookie('l2gether_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.json({
      success: true,
      room: authResult.room,
      session: {
        sessionId: session.id,
        displayName: session.display_name,
        token
      }
    });
  } catch (err) {
    console.error('[Host Login Error]', err);
    res.status(500).json({ error: 'Failed to authenticate host: ' + err.message });
  }
});

/**
 * Create a new room
 * POST /api/rooms
 */
router.post('/', async (req, res) => {
  try {
    let session = null;
    let token = null;

    // Check if session token passed or create one with displayName
    const rawToken = req.headers['x-session-token'] || req.cookies?.l2gether_session;
    const { name, description, visibility, displayName, templateType, ownerPassword, maxParticipants } = req.body;

    if (rawToken) {
      // Find existing session
      const { hashToken } = await import('../middleware/auth.js');
      const hash = hashToken(rawToken);
      const sRes = await db.query(
        `SELECT id, display_name FROM guest_sessions WHERE session_token_hash = $1`,
        [hash]
      );
      if (sRes.rows.length > 0) {
        session = sRes.rows[0];
        token = rawToken;
      }
    }

    if (!session) {
      if (!displayName || displayName.trim().length === 0) {
        return res.status(400).json({ error: 'Display name is required to create a room.' });
      }
      const newSess = await createGuestSession(displayName);
      session = { id: newSess.sessionId, display_name: newSess.displayName };
      token = newSess.token;
    }

    const room = await createRoom({
      name,
      description,
      visibility,
      ownerSessionId: session.id,
      templateType: templateType || 'web',
      ownerPassword,
      maxParticipants
    });

    res.cookie('l2gether_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    res.status(201).json({
      room,
      session: {
        sessionId: session.id,
        displayName: session.display_name,
        token
      }
    });
  } catch (err) {
    console.error('[Create Room Error]', err);
    res.status(500).json({ error: 'Failed to create room: ' + err.message });
  }
});

/**
 * Get room public details and status
 * GET /api/rooms/:roomId
 */
router.get('/:roomId', async (req, res) => {
  try {
    const rawToken = req.headers['x-session-token'] || req.cookies?.l2gether_session;
    let currentSessionId = null;

    if (rawToken) {
      const { hashToken } = await import('../middleware/auth.js');
      const hash = hashToken(rawToken);
      const sRes = await db.query(
        `SELECT id FROM guest_sessions WHERE session_token_hash = $1`,
        [hash]
      );
      if (sRes.rows.length > 0) {
        currentSessionId = sRes.rows[0].id;
      }
    }

    const room = await getRoomDetails(req.params.roomId, currentSessionId);
    if (!room) {
      return res.status(404).json({ error: 'Room not found.', code: 'ROOM_NOT_FOUND' });
    }

    res.json(room);
  } catch (err) {
    console.error('[Get Room Error]', err);
    res.status(500).json({ error: 'Failed to retrieve room.' });
  }
});

/**
 * Join a room
 * POST /api/rooms/:roomId/join
 */
router.post('/:roomId/join', async (req, res) => {
  try {
    const { roomId } = req.params;
    let { displayName } = req.body;
    let session = null;
    let token = null;

    const rawToken = req.headers['x-session-token'] || req.cookies?.l2gether_session;
    if (rawToken) {
      const { hashToken } = await import('../middleware/auth.js');
      const hash = hashToken(rawToken);
      const sRes = await db.query(
        `SELECT id, display_name FROM guest_sessions WHERE session_token_hash = $1`,
        [hash]
      );
      if (sRes.rows.length > 0) {
        session = sRes.rows[0];
        token = rawToken;
      }
    }

    if (!session) {
      if (!displayName || displayName.trim().length === 0) {
        displayName = 'Guest-' + Math.floor(100 + Math.random() * 900);
      }
      const newSess = await createGuestSession(displayName);
      session = { id: newSess.sessionId, display_name: newSess.displayName };
      token = newSess.token;
    }

    const result = await joinRoom({ roomId, sessionId: session.id });

    if (result.status === 'not_found') {
      return res.status(404).json(result);
    }
    if (result.status === 'expired') {
      return res.status(410).json(result);
    }
    if (result.status === 'rejected' || result.status === 'closed') {
      return res.status(403).json(result);
    }

    res.cookie('l2gether_session', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000
    });

    if (result.status === 'joined') {
      const io = req.app.get('io');
      if (io) {
        getRoomParticipants(roomId).then((participants) => {
          io.to(roomId).emit('room_participants_updated', {
            roomId,
            participantCount: participants.length,
            participants
          });
        }).catch(() => {});
      }
    } else if (result.status === 'pending') {
      const io = req.app.get('io');
      if (io) {
        getPendingJoinRequests(roomId).then((requests) => {
          io.to(roomId).emit('pending_requests_updated', {
            roomId,
            requestCount: requests.length,
            requests
          });
          io.to(roomId).emit('new_join_request', {
            roomId,
            requestId: result.requestId,
            sessionId: session.id,
            displayName: session.display_name,
            requestCount: requests.length
          });
        }).catch(() => {});
      }
    }

    res.json({
      ...result,
      session: {
        sessionId: session.id,
        displayName: session.display_name,
        token
      }
    });
  } catch (err) {
    console.error('[Join Room Error]', err);
    res.status(500).json({ error: 'Failed to join room: ' + err.message });
  }
});

/**
 * List participants for room
 * GET /api/rooms/:roomId/participants
 */
router.get('/:roomId/participants', requireSession, requireRoomMember, async (req, res) => {
  try {
    const participants = await getRoomParticipants(req.params.roomId);
    res.json({ participants });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve participants.' });
  }
});

/**
 * List pending join requests (owner only)
 * GET /api/rooms/:roomId/requests
 */
router.get('/:roomId/requests', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const requests = await getPendingJoinRequests(req.params.roomId);
    res.json({ requests });
  } catch (err) {
    res.status(500).json({ error: 'Failed to retrieve join requests.' });
  }
});

/**
 * Approve join request (owner only)
 * POST /api/rooms/:roomId/requests/:requestId/approve
 */
router.post('/:roomId/requests/:requestId/approve', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    const { rows } = await db.query(
      `SELECT session_id FROM join_requests WHERE id = $1 AND room_id = $2`,
      [requestId, roomId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ error: 'Join request not found.' });
    }

    const targetSessionId = rows[0].session_id;

    // Update request
    await db.query(
      `UPDATE join_requests SET status = 'approved', reviewed_at = datetime('now'), reviewed_by = $1 WHERE id = $2`,
      [req.session.id, requestId]
    );

    // Grant membership
    await db.query(
      `INSERT INTO room_memberships (id, room_id, session_id, role)
       VALUES ($1, $2, $3, 'participant')
       ON CONFLICT (room_id, session_id) DO UPDATE SET revoked_at = NULL`,
      [`mem_${Date.now()}`, roomId, targetSessionId]
    );

    const io = req.app.get('io');
    if (io) {
      getPendingJoinRequests(roomId).then((requests) => {
        io.to(roomId).emit('pending_requests_updated', {
          roomId,
          requestCount: requests.length,
          requests
        });
      }).catch(() => {});

      getRoomParticipants(roomId).then((participants) => {
        io.to(roomId).emit('room_participants_updated', {
          roomId,
          participantCount: participants.length,
          participants
        });
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Participant approved successfully.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to approve request.' });
  }
});

/**
 * Reject join request (owner only)
 * POST /api/rooms/:roomId/requests/:requestId/reject
 */
router.post('/:roomId/requests/:requestId/reject', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId, requestId } = req.params;
    await db.query(
      `UPDATE join_requests SET status = 'rejected', reviewed_at = datetime('now'), reviewed_by = $1 WHERE id = $2 AND room_id = $3`,
      [req.session.id, requestId, roomId]
    );

    const io = req.app.get('io');
    if (io) {
      getPendingJoinRequests(roomId).then((requests) => {
        io.to(roomId).emit('pending_requests_updated', {
          roomId,
          requestCount: requests.length,
          requests
        });
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Join request rejected.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reject request.' });
  }
});

/**
 * Remove participant (owner only)
 * DELETE /api/rooms/:roomId/participants/:sessionId
 */
router.delete('/:roomId/participants/:sessionId', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId, sessionId } = req.params;
    if (sessionId === req.session.id) {
      return res.status(400).json({ error: 'Owner cannot remove themselves. Use close room instead.' });
    }

    await db.query(
      `UPDATE room_memberships SET revoked_at = datetime('now') WHERE room_id = $1 AND session_id = $2`,
      [roomId, sessionId]
    );

    // Broadcast participant removal via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('participant_removed', {
        roomId,
        sessionId,
        message: 'You have been removed from this room by the host.'
      });
      getRoomParticipants(roomId).then((participants) => {
        io.to(roomId).emit('room_participants_updated', {
          roomId,
          participantCount: participants.length,
          participants
        });
      }).catch(() => {});
    }

    res.json({ success: true, message: 'Participant removed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to remove participant.' });
  }
});

/**
 * Update room settings (owner only)
 * PATCH /api/rooms/:roomId/settings
 */
router.patch('/:roomId/settings', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { name, description, visibility } = req.body;

    const updates = [];
    const params = [];
    let pIdx = 1;

    if (name) {
      updates.push(`name = $${pIdx++}`);
      params.push(name.trim().slice(0, 100));
    }
    if (description !== undefined) {
      updates.push(`description = $${pIdx++}`);
      params.push(description.trim().slice(0, 500));
    }
    if (visibility && (visibility === 'public' || visibility === 'private')) {
      updates.push(`visibility = $${pIdx++}`);
      params.push(visibility);
    }

    if (updates.length > 0) {
      params.push(roomId);
      await db.query(`UPDATE rooms SET ${updates.join(', ')} WHERE id = $${pIdx}`, params);
    }

    const updated = await getRoomDetails(roomId, req.session.id);
    res.json(updated);
  } catch (err) {
    res.status(500).json({ error: 'Failed to update settings.' });
  }
});

/**
 * Toggle editing lock (owner only)
 * PATCH /api/rooms/:roomId/lock
 */
router.patch('/:roomId/lock', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { locked, path, all } = req.body;

    const result = await setRoomEditingLock(roomId, {
      locked: Boolean(locked),
      path: path || null,
      all: Boolean(all)
    });

    // Notify room via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('edit_lock_changed', {
        roomId,
        isLocked: result.isLocked,
        lockedFiles: result.lockedFiles,
        path: path || null,
        all: Boolean(all),
        lockedBy: req.session.display_name
      });
    }

    res.json({ success: true, ...result });
  } catch (err) {
    console.error('[Lock Editing Error]', err);
    res.status(500).json({ error: 'Failed to toggle editing lock.' });
  }
});

/**
 * Close room (owner only)
 * POST /api/rooms/:roomId/close
 */
router.post('/:roomId/close', requireSession, requireRoomMember, requireRoomOwner, async (req, res) => {
  try {
    const { roomId } = req.params;
    await db.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [roomId]);
    await db.query(`UPDATE room_memberships SET revoked_at = datetime('now') WHERE room_id = $1`, [roomId]);

    // Broadcast room_closed via socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('room_closed', {
        roomId,
        message: 'This room has been closed by the host.'
      });
    }

    res.json({ success: true, message: 'Room has been closed.' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to close room.' });
  }
});

export default router;
