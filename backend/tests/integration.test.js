import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase, query } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { setupSockets } from '../src/sockets/index.js';
import { createGuestSession, createRoom } from '../src/services/roomService.js';

test('Full Integration & Real-Time Socket Test', async (t) => {
  await initDatabase();

  const app = createApp();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
  app.set('io', ioServer);
  setupSockets(ioServer);

  const port = 5055;
  await new Promise((resolve) => server.listen(port, resolve));

  let hostSession = null;
  let participantSession = null;
  let room = null;
  let clientSocket1 = null;
  let clientSocket2 = null;

  t.after(() => {
    if (clientSocket1) clientSocket1.disconnect();
    if (clientSocket2) clientSocket2.disconnect();
    ioServer.close();
    server.close();
  });

  await t.test('1. Guest creates room and connects to real-time socket', async () => {
    hostSession = await createGuestSession('HostDev');
    room = await createRoom({
      name: 'Integration Room',
      ownerSessionId: hostSession.sessionId
    });

    clientSocket1 = ClientIO(`http://localhost:${port}`, {
      auth: { token: hostSession.token }
    });

    await new Promise((resolve) => {
      clientSocket1.on('connect', () => {
        clientSocket1.emit('join_room', { roomId: room.id });
        resolve();
      });
    });

    assert.ok(clientSocket1.connected, 'Host socket should be connected');
  });

  await t.test('2. Second user joins room and both exchange real-time chat messages', async () => {
    participantSession = await createGuestSession('ParticipantDev');

    clientSocket2 = ClientIO(`http://localhost:${port}`, {
      auth: { token: participantSession.token }
    });

    await new Promise((resolve) => {
      clientSocket2.on('connect', () => {
        clientSocket2.emit('join_room', { roomId: room.id });
        resolve();
      });
    });

    // Send chat message from socket 2 and verify received on socket 1
    const receivedMessagePromise = new Promise((resolve) => {
      clientSocket1.on('new_message', (msg) => {
        if (msg.content === 'Realtime socket test message') {
          resolve(msg);
        }
      });
    });

    clientSocket2.emit('send_message', {
      roomId: room.id,
      content: 'Realtime socket test message',
      messageType: 'text'
    });

    const received = await receivedMessagePromise;
    assert.equal(received.content, 'Realtime socket test message');
    assert.equal(received.sender_name, 'ParticipantDev');
  });

  await t.test('3. Collaborative code change broadcasting', async () => {
    const codeUpdatePromise = new Promise((resolve) => {
      clientSocket1.on('remote_code_change', (data) => {
        if (data.path === 'main.py') {
          resolve(data);
        }
      });
    });

    clientSocket2.emit('code_change', {
      roomId: room.id,
      path: 'main.py',
      content: 'print("collaborative edit test")'
    });

    const update = await codeUpdatePromise;
    assert.equal(update.content, 'print("collaborative edit test")');
    assert.equal(update.senderDisplayName, 'ParticipantDev');
  });

  await t.test('4. WebRTC Audio Signaling exchange', async () => {
    const audioOfferPromise = new Promise((resolve) => {
      clientSocket2.on('audio_offer', (data) => {
        resolve(data);
      });
    });

    // Host sends mock audio offer to participant
    clientSocket1.emit('audio_offer', {
      targetSocketId: clientSocket2.id,
      offer: { type: 'offer', sdp: 'mock-sdp-data' }
    });

    const receivedOffer = await audioOfferPromise;
    assert.equal(receivedOffer.offer.sdp, 'mock-sdp-data');
    assert.equal(receivedOffer.displayName, 'HostDev');
  });

  await t.test('5. Host locks editing, blocking participant edits', async () => {
    const lockChangePromise = new Promise((resolve) => {
      clientSocket2.on('edit_lock_changed', (data) => {
        resolve(data);
      });
    });

    // Host locks editing
    clientSocket1.emit('toggle_edit_lock', {
      roomId: room.id,
      isLocked: true
    });

    const lockData = await lockChangePromise;
    assert.equal(lockData.isLocked, true);
    assert.equal(lockData.lockedBy, 'HostDev');

    // Participant tries to emit code_change while locked
    const rejectPromise = new Promise((resolve) => {
      clientSocket2.on('edit_lock_rejected', (data) => {
        resolve(data);
      });
    });

    clientSocket2.emit('code_change', {
      roomId: room.id,
      path: 'main.py',
      content: 'malicious participant edit'
    });

    const rejectData = await rejectPromise;
    assert.ok(rejectData.message.includes('locked'));

    // Host unlocks editing
    const unlockPromise = new Promise((resolve) => {
      clientSocket2.on('edit_lock_changed', (data) => {
        resolve(data);
      });
    });

    clientSocket1.emit('toggle_edit_lock', {
      roomId: room.id,
      isLocked: false
    });

    const unlockData = await unlockPromise;
    assert.equal(unlockData.isLocked, false);
  });

  await t.test('6. Real-time active page/file switching notification', async () => {
    const activeFilePromise = new Promise((resolve) => {
      clientSocket1.on('user_active_file_changed', (data) => {
        if (data.path === 'README.md') {
          resolve(data);
        }
      });
    });

    // Participant switches active file
    clientSocket2.emit('active_file_change', {
      roomId: room.id,
      path: 'README.md'
    });

    const activeFileData = await activeFilePromise;
    assert.equal(activeFileData.path, 'README.md');
    assert.equal(activeFileData.displayName, 'ParticipantDev');

    // Host switches active file back to main.py
    const hostActiveFilePromise = new Promise((resolve) => {
      clientSocket2.on('user_active_file_changed', (data) => {
        if (data.path === 'main.py' && data.isHost) {
          resolve(data);
        }
      });
    });

    clientSocket1.emit('active_file_change', {
      roomId: room.id,
      path: 'main.py',
      isHost: true
    });

    const hostFileData = await hostActiveFilePromise;
    assert.equal(hostFileData.path, 'main.py');
    assert.equal(hostFileData.isHost, true);
    assert.equal(hostFileData.displayName, 'HostDev');
  });

  await t.test('7. Host removes participant, participant receives event in real time', async () => {
    const removalPromise = new Promise((resolve) => {
      clientSocket2.on('participant_removed', (data) => {
        resolve(data);
      });
    });

    // Host removes participant via socket
    clientSocket1.emit('remove_participant', {
      roomId: room.id,
      targetSessionId: participantSession.sessionId
    });

    const removalData = await removalPromise;
    assert.equal(removalData.roomId, room.id);
    assert.equal(removalData.sessionId, participantSession.sessionId);
    assert.ok(removalData.message.includes('removed'));
  });

  await t.test('8. Host closes room, all connected clients receive room_closed event', async () => {
    const roomClosePromise = new Promise((resolve) => {
      clientSocket2.on('room_closed', (data) => {
        resolve(data);
      });
    });

    // Host closes room via socket
    clientSocket1.emit('close_room', {
      roomId: room.id
    });

    const closeData = await roomClosePromise;
    assert.equal(closeData.roomId, room.id);
    assert.ok(closeData.message.includes('closed'));
  });

  await t.test('9. REST API close room emits room_closed event to clients', async () => {
    const testRoom = await createRoom({
      name: 'REST Close Room',
      ownerSessionId: hostSession.sessionId
    });

    const clientSocket3 = ClientIO(`http://localhost:${port}`, {
      auth: { token: participantSession.token }
    });

    await new Promise((resolve) => clientSocket3.on('connect', resolve));
    clientSocket3.emit('join_room', { roomId: testRoom.id });

    const closePromise = new Promise((resolve) => {
      clientSocket3.on('room_closed', (data) => {
        resolve(data);
      });
    });

    const res = await fetch(`http://localhost:${port}/api/rooms/${testRoom.id}/close`, {
      method: 'POST',
      headers: {
        'x-session-token': hostSession.token
      }
    });
    const json = await res.json();
    assert.equal(json.success, true);

    const closeData = await closePromise;
    assert.equal(closeData.roomId, testRoom.id);
    assert.ok(closeData.message.includes('closed'));

    clientSocket3.disconnect();
  });

  await t.test('10. Batch move and batch copy workspace files into folder', async () => {
    const batchRoom = await createRoom({
      name: 'Batch Move Room',
      ownerSessionId: hostSession.sessionId
    });

    const moveRes = await fetch(`http://localhost:${port}/api/rooms/${batchRoom.id}/workspace/files/batch-move`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': hostSession.token
      },
      body: JSON.stringify({
        paths: ['index.html', 'styles.css'],
        targetFolder: 'public'
      })
    });
    const moveJson = await moveRes.json();
    assert.equal(moveJson.success, true);
    assert.equal(moveJson.moves.length, 2);
    assert.equal(moveJson.moves[0].newPath, 'public/index.html');
    assert.equal(moveJson.moves[1].newPath, 'public/styles.css');

    // Test batch copy
    const copyRes = await fetch(`http://localhost:${port}/api/rooms/${batchRoom.id}/workspace/files/batch-copy`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': hostSession.token
      },
      body: JSON.stringify({
        paths: ['public/index.html'],
        targetFolder: 'backup'
      })
    });
    const copyJson = await copyRes.json();
    assert.equal(copyJson.success, true);
    assert.ok(copyJson.copied.length >= 1);
    assert.equal(copyJson.copied[0].path, 'backup/index.html');
  });

  await t.test('11. Batch upload files and images from drag-and-drop into workspace', async () => {
    const uploadRoom = await createRoom({
      name: 'Upload Drop Room',
      ownerSessionId: hostSession.sessionId
    });

    const mockPngDataUrl = 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==';

    const res = await fetch(`http://localhost:${port}/api/rooms/${uploadRoom.id}/workspace/files/batch-upload`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-session-token': hostSession.token
      },
      body: JSON.stringify({
        files: [
          {
            path: 'images/logo.png',
            content: mockPngDataUrl,
            isDirectory: false
          },
          {
            path: 'components/Button.jsx',
            content: 'export default function Button() { return <button>Click</button>; }',
            isDirectory: false
          }
        ]
      })
    });

    const json = await res.json();
    assert.equal(json.success, true);
    assert.equal(json.uploadedCount, 2);

    const logoFile = json.files.find(f => f.path === 'images/logo.png');
    assert.ok(logoFile);
    assert.equal(logoFile.content, mockPngDataUrl);

    // Parent directory auto-creation check
    const imagesDir = json.files.find(f => f.path === 'images' && f.is_directory);
    assert.ok(imagesDir);

    const buttonFile = json.files.find(f => f.path === 'components/Button.jsx');
    assert.ok(buttonFile);
  });
});

