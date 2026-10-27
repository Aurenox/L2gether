import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import config from '../config/index.js';
import { generateSessionToken, hashToken } from '../middleware/auth.js';
import {
  hashPassword,
  verifyPassword,
  generateRecoveryKey,
  hashRecoveryKey,
  verifyRecoveryKey
} from '../utils/security.js';

// Generate clean, readable room ID e.g. "team-x7k9p2"
export function generateRoomId() {
  const chars = 'abcdefghjkmnpqrstuvwxyz23456789';
  let segment = '';
  for (let i = 0; i < 6; i++) {
    segment += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return `room-${segment}`;
}

/**
 * Creates a secure guest session
 */
export async function createGuestSession(displayName) {
  const cleanName = (displayName || 'Guest').trim().slice(0, 50);
  const sessionId = `sess_${uuidv4().replace(/-/g, '').slice(0, 16)}`;
  const rawToken = generateSessionToken();
  const tokenHash = hashToken(rawToken);

  // Guest session valid for 7 days
  const expiresAt = new Date(Date.now() + config.roomExpiryDays * 24 * 60 * 60 * 1000).toISOString();

  await db.query(
    `INSERT INTO guest_sessions (id, session_token_hash, display_name, expires_at)
     VALUES ($1, $2, $3, $4)`,
    [sessionId, tokenHash, cleanName, expiresAt]
  );

  return {
    sessionId,
    token: rawToken,
    displayName: cleanName,
    expiresAt
  };
}

/**
 * Creates a room with 7-day expiration and initializes a starter workspace
 */
export async function createRoom({
  name,
  description,
  visibility = 'public',
  ownerSessionId,
  templateType = 'web',
  ownerPassword = null,
  maxParticipants = 25
}) {
  const roomId = generateRoomId();
  const cleanName = (name || 'Collaborative Workspace').trim().slice(0, 100);
  const cleanDesc = (description || '').trim().slice(0, 500);
  const cleanVis = visibility === 'private' ? 'private' : 'public';
  const cleanMax = Math.max(2, Math.min(100, parseInt(maxParticipants, 10) || 25));

  const expiresAt = new Date(Date.now() + config.roomExpiryDays * 24 * 60 * 60 * 1000).toISOString();

  // Generate salted password hash if password provided
  let passwordHash = null;
  if (ownerPassword && ownerPassword.trim().length > 0) {
    passwordHash = hashPassword(ownerPassword.trim());
  }

  // Generate high-entropy recovery key for room owner
  const recoveryKey = generateRecoveryKey();
  const recoveryKeyHash = hashRecoveryKey(recoveryKey);

  // 1. Insert room
  await db.query(
    `INSERT INTO rooms (id, name, description, owner_session_id, visibility, owner_password_hash, owner_recovery_key_hash, max_participants, expires_at, status)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, 'active')`,
    [roomId, cleanName, cleanDesc, ownerSessionId || null, cleanVis, passwordHash || null, recoveryKeyHash, cleanMax, expiresAt]
  );

  // 2. Add owner membership if session is provided
  if (ownerSessionId) {
    const membershipId = `mem_${uuidv4().slice(0, 12)}`;
    await db.query(
      `INSERT INTO room_memberships (id, room_id, session_id, role)
       VALUES ($1, $2, $3, 'owner')`,
      [membershipId, roomId, ownerSessionId]
    );
  }

  // 3. Create default workspace
  const workspaceId = `ws_${uuidv4().slice(0, 12)}`;
  await db.query(
    `INSERT INTO workspaces (id, room_id, name, project_type)
     VALUES ($1, $2, $3, $4)`,
    [workspaceId, roomId, `${cleanName} Project`, templateType]
  );

  // 4. Populate default files based on starter template
  await initializeWorkspaceFiles(workspaceId, templateType);

  // 5. Add welcome system message
  const msgId = `msg_${uuidv4().slice(0, 12)}`;
  await db.query(
    `INSERT INTO messages (id, room_id, sender_name, message_type, content)
     VALUES ($1, $2, 'System', 'system', $3)`,
    [msgId, roomId, `Welcome to ${cleanName}! Room created. Everything here expires in 7 days.`]
  );

  return {
    id: roomId,
    name: cleanName,
    description: cleanDesc,
    visibility: cleanVis,
    expiresAt,
    workspaceId,
    recoveryKey,
    hasPassword: !!passwordHash
  };
}

/**
 * Initializes starter files for the project
 */
async function initializeWorkspaceFiles(workspaceId, templateType) {
  const files = [];

  const t = (templateType || 'webapp').toLowerCase();

  if (t === 'python' || t === 'py') {
    files.push({
      path: 'main.py',
      content: `# Python Starter File\nimport sys\n\ndef main():\n    print(f"Python {sys.version.split()[0]} workspace loaded.")\n    print("Collaborate, edit, and inspect code cleanly.")\n\nif __name__ == "__main__":\n    main()\n`
    });
  } else if (t === 'c') {
    files.push({
      path: 'main.c',
      content: `// C Starter File\n#include <stdio.h>\n\nint main(void) {\n    printf("Hello from L2gether C workspace!\\n");\n    return 0;\n}\n`
    });
  } else if (t === 'text') {
    files.push({
      path: 'notes.txt',
      content: `L2gether Scratchpad & Shared Notes\n===================================\nCollaborate and write shared notes, project outlines, ideas, and text in real-time.\n`
    });
  } else if (t === 'empty') {
    // Empty workspace - no files pre-populated
  } else {
    // Default: Web App (HTML + CSS + JS) with instant Live Preview
    files.push({
      path: 'index.html',
      content: `<!DOCTYPE html>\n<html lang="en">\n<head>\n  <meta charset="UTF-8" />\n  <meta name="viewport" content="width=device-width, initial-scale=1.0" />\n  <title>L2gether Live Preview</title>\n  <link rel="stylesheet" href="styles.css" />\n</head>\n<body>\n  <main class="container">\n    <div class="card">\n      <div class="badge">L2gether Workspace</div>\n      <h1>One link. Everything together.</h1>\n      <p>Edit HTML, CSS, and JS in real-time. Switch to the <strong>Live Preview</strong> tab to see your website immediately!</p>\n      <div class="interactive-area">\n        <button id="counter-btn" class="btn primary">Clicks: <span id="click-count">0</span></button>\n        <button id="color-btn" class="btn secondary">Toggle Accent Color</button>\n      </div>\n    </div>\n  </main>\n  <script src="script.js"></script>\n</body>\n</html>\n`
    });
    files.push({
      path: 'styles.css',
      content: `:root {\n  --bg: #0B0D12;\n  --card: #161B26;\n  --text: #F4F6FB;\n  --text-muted: #A2A9B8;\n  --accent: #7C6CFF;\n  --accent-alt: #36D6C5;\n  --border: #293142;\n}\n\n* {\n  box-sizing: border-box;\n  margin: 0;\n  padding: 0;\n}\n\nbody {\n  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;\n  background: var(--bg);\n  color: var(--text);\n  min-height: 100vh;\n  margin: 0;\n  padding: 1.5rem;\n  line-height: 1.6;\n}\n\n.container {\n  max-width: 600px;\n  width: 100%;\n  margin: 0 auto;\n  min-height: calc(100vh - 3rem);\n  display: flex;\n  flex-direction: column;\n  justify-content: center;\n}\n\n.card {\n  background: var(--card);\n  border: 1px solid var(--border);\n  border-radius: 16px;\n  padding: 2.5rem;\n  text-align: center;\n  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.4);\n}\n\n.badge {\n  display: inline-block;\n  background: rgba(124, 108, 255, 0.15);\n  color: var(--accent);\n  padding: 0.35rem 0.85rem;\n  border-radius: 999px;\n  font-size: 0.85rem;\n  font-weight: 600;\n  margin-bottom: 1.25rem;\n}\n\nh1 {\n  font-size: 2rem;\n  margin-bottom: 1rem;\n  line-height: 1.3;\n}\n\np {\n  color: var(--text-muted);\n  line-height: 1.6;\n  margin-bottom: 2rem;\n}\n\n.interactive-area {\n  display: flex;\n  gap: 1rem;\n  justify-content: center;\n  flex-wrap: wrap;\n}\n\n.btn {\n  border: none;\n  padding: 0.75rem 1.5rem;\n  border-radius: 8px;\n  font-size: 0.95rem;\n  font-weight: 600;\n  cursor: pointer;\n  transition: all 0.2s ease;\n}\n\n.btn.primary {\n  background: var(--accent);\n  color: #ffffff;\n}\n\n.btn.primary:hover {\n  filter: brightness(1.15);\n  transform: translateY(-1px);\n}\n\n.btn.secondary {\n  background: transparent;\n  color: var(--text);\n  border: 1px solid var(--border);\n}\n\n.btn.secondary:hover {\n  background: rgba(255, 255, 255, 0.05);\n}\n`
    });
    files.push({
      path: 'script.js',
      content: `// Interactive script for L2gether preview\nconsole.log("L2gether client script initialized!");\n\nlet clicks = 0;\nconst counterBtn = document.getElementById('counter-btn');\nconst countSpan = document.getElementById('click-count');\nconst colorBtn = document.getElementById('color-btn');\n\nif (counterBtn && countSpan) {\n  counterBtn.addEventListener('click', () => {\n    clicks++;\n    countSpan.textContent = clicks;\n    console.log(\`Button clicked \${clicks} times\`);\n  });\n}\n\nif (colorBtn) {\n  let toggle = false;\n  colorBtn.addEventListener('click', () => {\n    toggle = !toggle;\n    const root = document.documentElement;\n    root.style.setProperty('--accent', toggle ? '#36D6C5' : '#7C6CFF');\n    console.log("Accent color toggled to:", toggle ? 'Cyan' : 'Purple');\n  });\n}\n`
    });
  }

  for (const f of files) {
    const fileId = `file_${uuidv4().slice(0, 12)}`;
    await db.query(
      `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory)
       VALUES ($1, $2, $3, $4, 0)`,
      [fileId, workspaceId, f.path, f.content]
    );
  }
}

/**
 * Returns complete room details, expiration calculations, owner, and active participant count
 */
export async function getRoomDetails(roomId, currentSessionId = null) {
  const { rows } = await db.query(
    `SELECT r.id, r.name, r.description, r.owner_session_id, r.visibility, r.status, 
            r.created_at, r.expires_at, r.editing_locked, r.locked_files, r.max_participants, gs.display_name as owner_name
     FROM rooms r
     JOIN guest_sessions gs ON r.owner_session_id = gs.id
     WHERE r.id = $1`,
    [roomId]
  );

  if (rows.length === 0) return null;

  const room = rows[0];
  const now = new Date();
  const expiresAt = new Date(room.expires_at);
  const isExpired = room.status === 'expired' || expiresAt <= now;
  const timeRemainingMs = Math.max(0, expiresAt.getTime() - now.getTime());

  // Parse locked files array
  let lockedFilesList = [];
  try {
    lockedFilesList = JSON.parse(room.locked_files || '[]');
  } catch (e) {
    lockedFilesList = [];
  }
  if (room.editing_locked && !lockedFilesList.includes('*')) {
    lockedFilesList.push('*');
  }

  // Count active participants
  const partCountResult = await db.query(
    `SELECT COUNT(*) as count 
     FROM room_memberships 
     WHERE room_id = $1 AND revoked_at IS NULL`,
    [roomId]
  );
  const participantCount = parseInt(partCountResult.rows[0]?.count || '1', 10);

  // Check current user's membership and role
  let userRole = null;
  let isMember = false;
  let pendingApproval = false;

  if (currentSessionId) {
    const memberRes = await db.query(
      `SELECT role, revoked_at 
       FROM room_memberships 
       WHERE room_id = $1 AND session_id = $2`,
      [roomId, currentSessionId]
    );

    if (memberRes.rows.length > 0 && !memberRes.rows[0].revoked_at) {
      userRole = memberRes.rows[0].role;
      isMember = true;
    } else {
      // Check if pending join request
      const reqRes = await db.query(
        `SELECT status 
         FROM join_requests 
         WHERE room_id = $1 AND session_id = $2`,
        [roomId, currentSessionId]
      );
      if (reqRes.rows.length > 0) {
        if (reqRes.rows[0].status === 'pending') {
          pendingApproval = true;
        }
      }
    }
  }

  // Count pending join requests if user is owner
  let pendingRequestCount = 0;
  if (currentSessionId && currentSessionId === room.owner_session_id) {
    try {
      const pendingRes = await db.query(
        `SELECT COUNT(*) as count FROM join_requests WHERE room_id = $1 AND status = 'pending'`,
        [roomId]
      );
      pendingRequestCount = parseInt(pendingRes.rows[0]?.count || '0', 10);
    } catch (e) {
      pendingRequestCount = 0;
    }
  }

  const participants = await getRoomParticipants(roomId);

  return {
    id: room.id,
    name: room.name,
    description: room.description,
    visibility: room.visibility,
    status: isExpired ? 'expired' : room.status,
    createdAt: room.created_at,
    expiresAt: room.expires_at,
    isEditingLocked: Boolean(room.editing_locked || lockedFilesList.includes('*')),
    lockedFiles: lockedFilesList,
    timeRemainingMs,
    timeRemainingSeconds: Math.floor(timeRemainingMs / 1000),
    isExpired,
    ownerName: room.owner_name,
    ownerSessionId: room.owner_session_id,
    isOwner: currentSessionId === room.owner_session_id,
    participantCount: Math.max(participantCount, participants.length),
    maxParticipants: room.max_participants || 25,
    participants,
    userRole,
    isMember,
    pendingApproval,
    pendingRequestCount
  };
}

/**
 * Handles participant joining
 */
export async function joinRoom({ roomId, sessionId }) {
  const room = await getRoomDetails(roomId, sessionId);
  if (!room) {
    return { status: 'not_found', error: 'Room does not exist.' };
  }

  if (room.isExpired) {
    return { status: 'expired', error: 'This room has expired according to the 7-day retention policy.' };
  }

  if (room.status === 'closed') {
    return { status: 'closed', error: 'This room has been closed by its owner.' };
  }

  // If already member
  if (room.isMember) {
    return { status: 'joined', role: room.userRole, room };
  }

  // Check room capacity limit
  const maxCap = room.maxParticipants || 25;
  if (room.participantCount >= maxCap) {
    return {
      status: 'full',
      error: `Room has reached its maximum capacity of ${maxCap} members.`
    };
  }

  // If public room: grant immediate membership
  if (room.visibility === 'public') {
    const membershipId = `mem_${uuidv4().slice(0, 12)}`;
    await db.query(
      `INSERT INTO room_memberships (id, room_id, session_id, role, revoked_at)
       VALUES ($1, $2, $3, 'participant', NULL)
       ON CONFLICT (room_id, session_id) DO UPDATE SET revoked_at = NULL`,
      [membershipId, roomId, sessionId]
    );

    return { status: 'joined', role: 'participant', room };
  }

  // If private room: check or create join_request
  const existingReq = await db.query(
    `SELECT id, status FROM join_requests WHERE room_id = $1 AND session_id = $2`,
    [roomId, sessionId]
  );

  if (existingReq.rows.length > 0) {
    const reqStatus = existingReq.rows[0].status;
    if (reqStatus === 'approved') {
      // Grant membership
      const membershipId = `mem_${uuidv4().slice(0, 12)}`;
      await db.query(
        `INSERT INTO room_memberships (id, room_id, session_id, role, revoked_at)
         VALUES ($1, $2, $3, 'participant', NULL)
         ON CONFLICT (room_id, session_id) DO UPDATE SET revoked_at = NULL`,
        [membershipId, roomId, sessionId]
      );
      return { status: 'joined', role: 'participant', room };
    } else if (reqStatus === 'rejected') {
      return { status: 'rejected', error: 'Your request to join this private room was rejected by the owner.' };
    } else {
      return { status: 'pending', message: 'Join request is pending approval by the room owner.' };
    }
  }

  // Create new join request
  const reqId = `req_${uuidv4().slice(0, 12)}`;
  await db.query(
    `INSERT INTO join_requests (id, room_id, session_id, status)
     VALUES ($1, $2, $3, 'pending')`,
    [reqId, roomId, sessionId]
  );

  return {
    status: 'pending',
    message: 'Join request sent. Please wait for the room owner to approve your access.',
    requestId: reqId
  };
}

/**
 * List participants for a room
 */
export async function getRoomParticipants(roomId) {
  const { rows } = await db.query(
    `SELECT rm.session_id, rm.role, rm.joined_at, gs.display_name
     FROM room_memberships rm
     JOIN guest_sessions gs ON rm.session_id = gs.id
     WHERE rm.room_id = $1 AND rm.revoked_at IS NULL
     ORDER BY (rm.role = 'owner') DESC, rm.joined_at ASC`,
    [roomId]
  );
  return rows;
}

/**
 * List pending join requests (for room owner)
 */
export async function getPendingJoinRequests(roomId) {
  const { rows } = await db.query(
    `SELECT jr.id, jr.session_id, jr.status, jr.created_at, gs.display_name
     FROM join_requests jr
     JOIN guest_sessions gs ON jr.session_id = gs.id
     WHERE jr.room_id = $1 AND jr.status = 'pending'
     ORDER BY jr.created_at ASC`,
    [roomId]
  );
  return rows;
}

/**
 * Authenticates room creator/owner using owner password or recovery key
 * Works seamlessly even when owner returns from another device or after being offline!
 */
export async function authenticateOwner({ roomId, password, recoveryKey, sessionId }) {
  const { rows } = await db.query(
    `SELECT id, name, description, owner_session_id, visibility, status, expires_at,
            owner_password_hash, owner_recovery_key_hash
     FROM rooms
     WHERE id = $1`,
    [roomId]
  );

  if (rows.length === 0) {
    return { success: false, error: 'Room does not exist.', code: 'ROOM_NOT_FOUND' };
  }

  const room = rows[0];
  const now = new Date();
  if (room.status === 'expired' || new Date(room.expires_at) <= now) {
    return { success: false, error: 'This room has expired according to the 7-day retention policy.', code: 'ROOM_EXPIRED' };
  }
  if (room.status === 'closed') {
    return { success: false, error: 'This room has been closed by the host.', code: 'ROOM_CLOSED' };
  }

  let verified = false;

  if (password && room.owner_password_hash) {
    verified = verifyPassword(password, room.owner_password_hash);
  } else if (recoveryKey && room.owner_recovery_key_hash) {
    verified = verifyRecoveryKey(recoveryKey, room.owner_recovery_key_hash);
  }

  if (!verified) {
    return {
      success: false,
      error: 'Invalid owner credentials. Please check your room password or recovery key.',
      code: 'INVALID_CREDENTIALS'
    };
  }

  // Grant or elevate session to owner role
  const memId = `mem_${uuidv4().slice(0, 12)}`;
  await db.query(
    `INSERT INTO room_memberships (id, room_id, session_id, role, revoked_at)
     VALUES ($1, $2, $3, 'owner', NULL)
     ON CONFLICT (room_id, session_id) DO UPDATE SET role = 'owner', revoked_at = NULL`,
    [memId, roomId, sessionId]
  );

  // Update room owner_session_id to current session so owner can manage from returning browser
  await db.query(`UPDATE rooms SET owner_session_id = $1 WHERE id = $2`, [sessionId, roomId]);

  const fullDetails = await getRoomDetails(roomId, sessionId);
  return {
    success: true,
    room: fullDetails,
    role: 'owner'
  };
}

/**
 * Toggles editing lock on the room or specific file (owner only)
 */
export async function setRoomEditingLock(roomId, options = {}) {
  const locked = typeof options === 'boolean' ? options : !!options.locked;
  const path = typeof options === 'object' ? options.path : null;
  const all = typeof options === 'object' ? !!options.all : !path;

  const { rows } = await db.query(
    `SELECT editing_locked, locked_files FROM rooms WHERE id = $1`,
    [roomId]
  );
  if (rows.length === 0) return { isLocked: false, lockedFiles: [] };

  let lockedFiles = [];
  try {
    lockedFiles = JSON.parse(rows[0].locked_files || '[]');
  } catch (e) {
    lockedFiles = [];
  }

  let editingLocked = rows[0].editing_locked;

  if (all || !path) {
    editingLocked = locked ? 1 : 0;
    if (locked) {
      lockedFiles = ['*'];
    } else {
      // Unlocking all clears all file locks completely so no single file remains stuck in locked state
      lockedFiles = [];
    }
  } else if (path) {
    if (locked) {
      if (!lockedFiles.includes(path)) lockedFiles.push(path);
    } else {
      lockedFiles = lockedFiles.filter((f) => f !== path && f !== '*');
    }
    if (lockedFiles.length === 0) {
      editingLocked = 0;
    }
  }

  await db.query(
    `UPDATE rooms SET editing_locked = $1, locked_files = $2 WHERE id = $3`,
    [editingLocked, JSON.stringify(lockedFiles), roomId]
  );

  return {
    isLocked: Boolean(editingLocked || lockedFiles.includes('*')),
    lockedFiles
  };
}


