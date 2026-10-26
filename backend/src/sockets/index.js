import db from '../database/db.js';
import { v4 as uuidv4 } from 'uuid';
import { hashToken } from '../middleware/auth.js';
import { setRoomEditingLock, getRoomParticipants } from '../services/roomService.js';
import {
  startInteractiveSession,
  sendInputToInteractiveSession,
  stopInteractiveSession
} from '../services/interactiveTerminalService.js';

// Map of active sockets: socketId -> { sessionId, displayName, roomId, inAudio }
const socketUsers = new Map();

export function setupSockets(io) {
  io.use(async (socket, next) => {
    try {
      const rawToken = socket.handshake.auth?.token || socket.handshake.headers['x-session-token'];
      if (!rawToken) {
        return next(new Error('Authentication token required'));
      }

      const tokenHash = hashToken(rawToken);
      const { rows } = await db.query(
        `SELECT id, display_name FROM guest_sessions WHERE session_token_hash = $1`,
        [tokenHash]
      );

      if (rows.length === 0) {
        return next(new Error('Invalid guest session token'));
      }

      socket.user = {
        sessionId: rows[0].id,
        displayName: rows[0].display_name
      };

      next();
    } catch (err) {
      next(new Error('Socket authentication failed: ' + err.message));
    }
  });

  io.on('connection', (socket) => {
    const user = socket.user;

    // Join room
    socket.on('join_room', async ({ roomId }) => {
      if (!roomId) return;

      // Verify room status and active membership
      const { rows: roomRows } = await db.query(
        `SELECT id, owner_session_id, visibility, status, expires_at FROM rooms WHERE id = $1`,
        [roomId]
      );

      if (roomRows.length === 0 || roomRows[0].status === 'expired' || new Date(roomRows[0].expires_at) < new Date()) {
        socket.emit('error_message', { message: 'Cannot join. Room is expired or not found.' });
        return;
      }

      if (roomRows[0].status === 'closed') {
        socket.emit('room_closed', { roomId, message: 'This room has been closed by the host.' });
        return;
      }

      const ownerSessionId = roomRows[0]?.owner_session_id;
      const isOwner = ownerSessionId === user.sessionId;
      const isPublic = roomRows[0]?.visibility === 'public';

      // Ensure user is either room owner or approved member before joining socket room
      if (!isOwner) {
        const { rows: memRows } = await db.query(
          `SELECT role, revoked_at FROM room_memberships WHERE room_id = $1 AND session_id = $2`,
          [roomId, user.sessionId]
        );
        const hasActiveMembership = memRows.length > 0 && !memRows[0].revoked_at;

        if (!hasActiveMembership) {
          if (isPublic) {
            const memId = `mem_${uuidv4().slice(0, 12)}`;
            await db.query(
              `INSERT INTO room_memberships (id, room_id, session_id, role)
               VALUES ($1, $2, $3, 'member')
               ON CONFLICT (room_id, session_id) DO UPDATE SET revoked_at = NULL`,
              [memId, roomId, user.sessionId]
            );
          } else {
            socket.emit('error_message', { message: 'You are not an active participant in this room.' });
            return;
          }
        }
      }

      socket.join(roomId);
      socketUsers.set(socket.id, {
        sessionId: user.sessionId,
        displayName: user.displayName,
        roomId,
        inAudio: false,
        isMuted: false
      });

      // Broadcast authoritative participants and participantCount to room immediately
      try {
        const participants = await getRoomParticipants(roomId);
        const participantCount = participants.length;
        io.to(roomId).emit('room_participants_updated', {
          roomId,
          participantCount,
          participants
        });
        socket.to(roomId).emit('user_joined', {
          sessionId: user.sessionId,
          displayName: user.displayName,
          socketId: socket.id,
          participantCount,
          participants
        });
      } catch (e) {
        socket.to(roomId).emit('user_joined', {
          sessionId: user.sessionId,
          displayName: user.displayName,
          socketId: socket.id
        });
      }

      // Send active audio participants in room to the newly joined client
      const audioPeers = [];
      for (const [sId, u] of socketUsers.entries()) {
        if (u.roomId === roomId && u.inAudio && sId !== socket.id) {
          audioPeers.push({
            socketId: sId,
            sessionId: u.sessionId,
            displayName: u.displayName,
            isMuted: u.isMuted
          });
        }
      }
      socket.emit('existing_audio_peers', { peers: audioPeers });

      // Send existing collaborators' active files
      const collabs = [];
      for (const [sId, u] of socketUsers.entries()) {
        if (u.roomId === roomId && sId !== socket.id && u.activeFile) {
          collabs.push({
            sessionId: u.sessionId,
            displayName: u.displayName,
            path: u.activeFile,
            isHost: u.sessionId === ownerSessionId
          });
        }
      }
      socket.emit('existing_collaborator_files', { collaborators: collabs });
    });

    // Chat Message
    socket.on('send_message', async ({ roomId, content, messageType = 'text', metadata, tempId }) => {
      if (!roomId || !content || typeof content !== 'string') return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return; // Strict room isolation

      const cleanContent = content.trim().slice(0, 5000);
      if (!cleanContent) return;

      try {
        const messageId = `msg_${uuidv4().slice(0, 12)}`;
        const metaStr = metadata ? (typeof metadata === 'string' ? metadata : JSON.stringify(metadata)) : null;

        await db.query(
          `INSERT INTO messages (id, room_id, sender_session_id, sender_name, message_type, content, metadata)
           VALUES ($1, $2, $3, $4, $5, $6, $7)`,
          [
            messageId,
            roomId,
            user.sessionId,
            user.displayName,
            messageType,
            cleanContent,
            metaStr
          ]
        );

        let parsedMeta = metadata;
        if (typeof metadata === 'string') {
          try { parsedMeta = JSON.parse(metadata); } catch {}
        }

        const savedMessage = {
          id: messageId,
          tempId: tempId || null,
          room_id: roomId,
          sender_session_id: user.sessionId,
          sender_name: user.displayName,
          message_type: messageType,
          content: cleanContent,
          metadata: parsedMeta,
          created_at: new Date().toISOString()
        };

        // Broadcast authoritative message to everyone in room including sender
        io.to(roomId).emit('new_message', savedMessage);
      } catch (err) {
        console.error('[Socket Chat Send Error]', err);
      }
    });

    // Typing Indicator
    socket.on('typing_status', ({ roomId, isTyping }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      socket.to(roomId).emit('user_typing', {
        sessionId: user.sessionId,
        displayName: user.displayName,
        isTyping
      });
    });

    // Host locks / unlocks code editing for other members (all files or specific file)
    socket.on('toggle_edit_lock', async ({ roomId, isLocked, path, all }) => {
      if (!roomId) return;
      try {
        const { rows } = await db.query(
          `SELECT owner_session_id FROM rooms WHERE id = $1`,
          [roomId]
        );
        if (rows.length > 0 && rows[0].owner_session_id === user.sessionId) {
          const result = await setRoomEditingLock(roomId, {
            locked: isLocked !== undefined ? isLocked : true,
            path: path || null,
            all: all !== undefined ? all : !path
          });
          io.to(roomId).emit('edit_lock_changed', {
            roomId,
            isLocked: result.isLocked,
            lockedFiles: result.lockedFiles,
            path: path || null,
            all: all !== undefined ? all : !path,
            lockedBy: user.displayName
          });
        }
      } catch (err) {
        console.error('[Socket toggle_edit_lock error]', err);
      }
    });

    // Host closes room via socket
    socket.on('close_room', async ({ roomId }) => {
      if (!roomId) return;
      try {
        const { rows } = await db.query(
          `SELECT owner_session_id FROM rooms WHERE id = $1`,
          [roomId]
        );
        if (rows.length > 0 && rows[0].owner_session_id === user.sessionId) {
          await db.query(`UPDATE rooms SET status = 'closed' WHERE id = $1`, [roomId]);
          await db.query(`UPDATE room_memberships SET revoked_at = datetime('now') WHERE room_id = $1`, [roomId]);
          io.to(roomId).emit('room_closed', {
            roomId,
            message: 'This room has been closed by the host.'
          });
        }
      } catch (err) {
        console.error('[Socket close_room error]', err);
      }
    });

    // Host removes participant via socket
    socket.on('remove_participant', async ({ roomId, targetSessionId }) => {
      if (!roomId || !targetSessionId) return;
      try {
        const { rows } = await db.query(
          `SELECT owner_session_id FROM rooms WHERE id = $1`,
          [roomId]
        );
        if (rows.length > 0 && rows[0].owner_session_id === user.sessionId && targetSessionId !== user.sessionId) {
          await db.query(
            `UPDATE room_memberships SET revoked_at = datetime('now') WHERE room_id = $1 AND session_id = $2`,
            [roomId, targetSessionId]
          );
          io.to(roomId).emit('participant_removed', {
            roomId,
            sessionId: targetSessionId,
            message: 'You have been removed from this room by the host.'
          });
        }
      } catch (err) {
        console.error('[Socket remove_participant error]', err);
      }
    });

    // Live Page / Active File Switching Awareness
    socket.on('active_file_change', async ({ roomId, path, isHost }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      u.activeFile = path || null;

      let userIsHost = Boolean(isHost);
      try {
        const { rows } = await db.query(`SELECT owner_session_id FROM rooms WHERE id = $1`, [roomId]);
        if (rows.length > 0 && rows[0].owner_session_id === user.sessionId) {
          userIsHost = true;
        }
      } catch (e) {}

      io.to(roomId).emit('user_active_file_changed', {
        sessionId: user.sessionId,
        displayName: user.displayName,
        socketId: socket.id,
        path: path || null,
        isHost: userIsHost
      });
    });

    // Real-Time Collaborative Code Editing
    socket.on('code_change', async ({ roomId, path, content, changeDetails }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      // Check edit lock (per-file or all files)
      try {
        const { rows } = await db.query(
          `SELECT owner_session_id, editing_locked, locked_files FROM rooms WHERE id = $1`,
          [roomId]
        );
        if (rows.length > 0 && rows[0].owner_session_id !== user.sessionId) {
          let lockedFiles = [];
          try {
            lockedFiles = JSON.parse(rows[0].locked_files || '[]');
          } catch (e) {}

          const isFileLocked = rows[0].editing_locked || lockedFiles.includes('*') || (path && lockedFiles.includes(path));
          if (isFileLocked) {
            socket.emit('edit_lock_rejected', {
              path,
              message: `Editing for "${path || 'this file'}" is locked by the room host.`
            });
            return;
          }
        }
      } catch (err) {
        // Continue
      }

      // Broadcast to other collaborators in the room
      socket.to(roomId).emit('remote_code_change', {
        path,
        content,
        changeDetails,
        senderSessionId: user.sessionId,
        senderDisplayName: user.displayName
      });
    });

    // Cursor position & selection awareness
    socket.on('cursor_move', ({ roomId, path, line, column, selection }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      socket.to(roomId).emit('remote_cursor', {
        sessionId: user.sessionId,
        displayName: user.displayName,
        path,
        line,
        column,
        selection
      });
    });

    // Workspace File Tree Real-time Sync
    socket.on('file_created', ({ roomId, file }) => {
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      socket.to(roomId).emit('remote_file_created', { file });
    });

    socket.on('file_deleted', ({ roomId, path }) => {
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      socket.to(roomId).emit('remote_file_deleted', { path });
    });

    socket.on('file_renamed', ({ roomId, oldPath, newPath }) => {
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      socket.to(roomId).emit('remote_file_renamed', { oldPath, newPath });
    });

    socket.on('workspace_files_updated', ({ roomId, files }) => {
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      socket.to(roomId).emit('remote_workspace_files_updated', { files });
    });

    // WebRTC Audio Signaling (Mesh)
    socket.on('audio_join', ({ roomId }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      u.inAudio = true;
      u.isMuted = false;

      // Send the newly joined participant the list of peers already in audio in this room
      const existingPeers = [];
      for (const [sId, usr] of socketUsers.entries()) {
        if (usr.roomId === roomId && usr.inAudio && sId !== socket.id) {
          existingPeers.push({
            socketId: sId,
            sessionId: usr.sessionId,
            displayName: usr.displayName,
            isMuted: usr.isMuted
          });
        }
      }
      socket.emit('existing_audio_participants', { peers: existingPeers });

      // Notify other active audio participants in this room to initiate peer connections
      socket.to(roomId).emit('peer_joined_audio', {
        socketId: socket.id,
        sessionId: user.sessionId,
        displayName: user.displayName
      });
    });

    socket.on('audio_leave', ({ roomId }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      u.inAudio = false;

      socket.to(roomId).emit('peer_left_audio', {
        socketId: socket.id,
        sessionId: user.sessionId
      });
    });

    socket.on('audio_offer', ({ targetSocketId, offer }) => {
      const sender = socketUsers.get(socket.id);
      const target = socketUsers.get(targetSocketId);
      // Strictly prevent cross-room audio signaling
      if (!sender || !target || sender.roomId !== target.roomId) return;

      io.to(targetSocketId).emit('audio_offer', {
        fromSocketId: socket.id,
        offer,
        displayName: user.displayName
      });
    });

    socket.on('audio_answer', ({ targetSocketId, answer }) => {
      const sender = socketUsers.get(socket.id);
      const target = socketUsers.get(targetSocketId);
      // Strictly prevent cross-room audio signaling
      if (!sender || !target || sender.roomId !== target.roomId) return;

      io.to(targetSocketId).emit('audio_answer', {
        fromSocketId: socket.id,
        answer
      });
    });

    socket.on('audio_ice_candidate', ({ targetSocketId, candidate }) => {
      if (!targetSocketId || !candidate) return;
      const sender = socketUsers.get(socket.id);
      const target = socketUsers.get(targetSocketId);
      // Strictly prevent cross-room audio signaling
      if (!sender || !target || sender.roomId !== target.roomId) return;
      io.to(targetSocketId).emit('audio_ice_candidate', {
        fromSocketId: socket.id,
        candidate
      });

      // If candidate is a masked .local mDNS candidate (default in Chromium on Windows/LAN),
      // also forward unmasked candidates so localhost and LAN connections succeed reliably
      if (candidate.candidate && typeof candidate.candidate === 'string' && candidate.candidate.includes('.local')) {
        let rawIp = socket.handshake.address || '';
        if (rawIp.startsWith('::ffff:')) rawIp = rawIp.replace('::ffff:', '');
        if (rawIp === '::1') rawIp = '127.0.0.1';

        const ipsToTry = new Set();
        if (rawIp && rawIp !== '127.0.0.1') ipsToTry.add(rawIp);
        ipsToTry.add('127.0.0.1');

        for (const ip of ipsToTry) {
          const unmaskedCandidateStr = candidate.candidate.replace(/[a-zA-Z0-9-]+\.local/, ip);
          io.to(targetSocketId).emit('audio_ice_candidate', {
            fromSocketId: socket.id,
            candidate: {
              ...candidate,
              candidate: unmaskedCandidateStr
            }
          });
        }
      }
    });

    socket.on('audio_mute_state', ({ roomId, isMuted }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;
      u.isMuted = isMuted;

      socket.to(roomId).emit('peer_mute_state', {
        socketId: socket.id,
        sessionId: user.sessionId,
        isMuted
      });
    });

    socket.on('audio_speaking_state', ({ roomId, isSpeaking }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      socket.to(roomId).emit('peer_speaking_state', {
        socketId: socket.id,
        sessionId: user.sessionId,
        isSpeaking
      });
    });

    // ==========================================
    // Real-Time Interactive Terminal Execution
    // ==========================================
    socket.on('terminal_session_start', async ({ roomId, language, code, filename, command, files }) => {
      if (!roomId) return;
      try {
        await startInteractiveSession({
          socket,
          roomId,
          language,
          code,
          filename,
          command,
          files,
          io
        });
      } catch (err) {
        socket.emit('terminal_session_output', {
          data: `Terminal session error: ${err.message}\r\n`,
          isError: true
        });
        socket.emit('terminal_session_exit', { exitCode: 1, durationMs: 0 });
      }
    });

    socket.on('terminal_session_input', ({ input }) => {
      if (input !== undefined && input !== null) {
        sendInputToInteractiveSession(socket.id, input);
      }
    });

    socket.on('terminal_session_stop', () => {
      stopInteractiveSession(socket.id);
    });

    // ==========================================
    // Real-Time Whiteboard Collaboration
    // ==========================================
    socket.on('whiteboard_draw', ({ roomId, stroke }) => {
      if (!roomId || !stroke) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      socket.to(roomId).emit('remote_whiteboard_draw', {
        stroke,
        senderSessionId: user.sessionId,
        senderDisplayName: user.displayName
      });
    });

    socket.on('whiteboard_clear', ({ roomId }) => {
      if (!roomId) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      socket.to(roomId).emit('remote_whiteboard_clear', {
        senderSessionId: user.sessionId,
        senderDisplayName: user.displayName
      });
    });

    socket.on('whiteboard_share_snapshot', async ({ roomId, dataUrl, title }) => {
      if (!roomId || !dataUrl) return;
      const u = socketUsers.get(socket.id);
      if (!u || u.roomId !== roomId) return;

      const msgId = `msg_${uuidv4().slice(0, 12)}`;
      const cleanTitle = title || 'Whiteboard Snapshot';
      const noteContent = `🎨 **Whiteboard Snapshot Shared by ${user.displayName || 'Teammate'}**\n![${cleanTitle}](${dataUrl})`;
      const metaObj = { imageUrl: dataUrl, title: cleanTitle };
      try {
        await db.query(
          `INSERT INTO messages (id, room_id, sender_session_id, sender_name, message_type, content, metadata)
           VALUES ($1, $2, $3, $4, 'image', $5, $6)`,
          [msgId, roomId, user.sessionId, user.displayName, noteContent, JSON.stringify(metaObj)]
        );
        io.to(roomId).emit('new_message', {
          id: msgId,
          room_id: roomId,
          sender_session_id: user.sessionId,
          sender_name: user.displayName,
          message_type: 'image',
          content: noteContent,
          metadata: metaObj,
          created_at: new Date().toISOString()
        });
      } catch (e) {
        console.warn('[Whiteboard Share Error]', e.message);
      }
    });

    // Disconnect
    socket.on('disconnect', () => {
      stopInteractiveSession(socket.id);
      const u = socketUsers.get(socket.id);
      if (u && u.roomId) {
        if (u.inAudio) {
          socket.to(u.roomId).emit('peer_left_audio', {
            socketId: socket.id,
            sessionId: u.sessionId
          });
        }
        socket.to(u.roomId).emit('user_active_file_cleared', {
          sessionId: u.sessionId
        });

        // Compute updated participants and notify room in real time
        getRoomParticipants(u.roomId).then((participants) => {
          const participantCount = participants.length;
          socket.to(u.roomId).emit('user_left', {
            sessionId: u.sessionId,
            displayName: u.displayName,
            socketId: socket.id,
            participantCount,
            participants
          });
          io.to(u.roomId).emit('room_participants_updated', {
            roomId: u.roomId,
            participantCount,
            participants
          });
        }).catch(() => {
          socket.to(u.roomId).emit('user_left', {
            sessionId: u.sessionId,
            displayName: u.displayName,
            socketId: socket.id
          });
        });
      }
      socketUsers.delete(socket.id);
    });
  });
}

export default setupSockets;
