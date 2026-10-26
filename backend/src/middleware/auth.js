import crypto from 'node:crypto';
import db from '../database/db.js';
import config from '../config/index.js';

export function hashToken(token) {
  return crypto
    .createHash('sha256')
    .update(token + config.sessionSecret)
    .digest('hex');
}

export function generateSessionToken() {
  return crypto.randomBytes(32).toString('hex');
}

/**
 * Middleware: Verifies guest session from Bearer / X-Session-Token header or cookie
 */
export async function requireSession(req, res, next) {
  try {
    const rawToken =
      req.headers['x-session-token'] ||
      (req.headers.authorization && req.headers.authorization.replace('Bearer ', '')) ||
      req.cookies?.l2gether_session;

    if (!rawToken) {
      return res.status(401).json({
        error: 'Authentication required. No guest session token provided.',
        code: 'NO_SESSION'
      });
    }

    const tokenHash = hashToken(rawToken);
    const { rows } = await db.query(
      `SELECT id, display_name, created_at, expires_at, revoked_at 
       FROM guest_sessions 
       WHERE session_token_hash = $1`,
      [tokenHash]
    );

    if (rows.length === 0) {
      return res.status(401).json({
        error: 'Invalid session token.',
        code: 'INVALID_SESSION'
      });
    }

    const session = rows[0];

    // Check expiration or revocation
    if (session.revoked_at || new Date(session.expires_at) < new Date()) {
      return res.status(401).json({
        error: 'Session has expired or was revoked.',
        code: 'SESSION_EXPIRED'
      });
    }

    req.session = session;
    req.rawToken = rawToken;
    next();
  } catch (err) {
    console.error('[Auth Error]', err);
    res.status(500).json({ error: 'Session validation error' });
  }
}

/**
 * Middleware: Requires the session to be an approved member of the room in req.params.roomId
 */
export async function requireRoomMember(req, res, next) {
  try {
    const roomId = req.params.roomId;
    if (!roomId) {
      return res.status(400).json({ error: 'Room ID is required.' });
    }

    // 1. Check room status and expiry
    const roomResult = await db.query(
      `SELECT id, name, description, owner_session_id, visibility, status, created_at, expires_at 
       FROM rooms 
       WHERE id = $1`,
      [roomId]
    );

    if (roomResult.rows.length === 0) {
      return res.status(404).json({ error: 'Room not found.', code: 'ROOM_NOT_FOUND' });
    }

    const room = roomResult.rows[0];

    if (room.status === 'expired' || new Date(room.expires_at) < new Date()) {
      return res.status(410).json({
        error: 'This room has expired according to the 7-day retention policy.',
        code: 'ROOM_EXPIRED'
      });
    }

    if (room.status === 'closed') {
      return res.status(403).json({
        error: 'This room has been closed by the owner.',
        code: 'ROOM_CLOSED'
      });
    }

    // 2. Check room membership
    const memberResult = await db.query(
      `SELECT role, joined_at, revoked_at 
       FROM room_memberships 
       WHERE room_id = $1 AND session_id = $2`,
      [roomId, req.session.id]
    );

    if (memberResult.rows.length === 0 || memberResult.rows[0].revoked_at) {
      return res.status(403).json({
        error: 'You are not an active participant in this room.',
        code: 'NOT_A_MEMBER'
      });
    }

    req.room = room;
    req.membership = memberResult.rows[0];
    req.isOwner = room.owner_session_id === req.session.id;

    next();
  } catch (err) {
    console.error('[Room Member Check Error]', err);
    res.status(500).json({ error: 'Failed to verify room membership.' });
  }
}

/**
 * Middleware: Requires session to be the room owner
 */
export function requireRoomOwner(req, res, next) {
  if (!req.isOwner) {
    return res.status(403).json({
      error: 'Permission denied. Only the room owner can perform this action.',
      code: 'OWNER_ONLY'
    });
  }
  next();
}
