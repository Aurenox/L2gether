import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { setupSockets } from '../src/sockets/index.js';
import { createGuestSession, createRoom, setRoomEditingLock } from '../src/services/roomService.js';

test('Lock and WebRTC Audio Communication Test Suite', async (t) => {
  await initDatabase();
  const app = createApp();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  setupSockets(io);
  app.set('io', io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  // 1. Setup room and members
  const host = await createGuestSession('HostUser');
  const participant = await createGuestSession('ParticipantUser');

  const room = await createRoom({
    name: 'Lock & Audio Test Room',
    description: 'Testing clean lock lifecycle and WebRTC audio signaling',
    visibility: 'public',
    ownerSessionId: host.sessionId
  });

  // 2. Connect client sockets
  const clientSocket1 = ClientIO(serverUrl, {
    auth: { token: host.token },
    transports: ['websocket']
  });

  const clientSocket2 = ClientIO(serverUrl, {
    auth: { token: participant.token },
    transports: ['websocket']
  });

  await new Promise((resolve) => clientSocket1.on('connect', resolve));
  await new Promise((resolve) => clientSocket2.on('connect', resolve));

  clientSocket1.emit('join_room', { roomId: room.id });
  clientSocket2.emit('join_room', { roomId: room.id });
  await new Promise((r) => setTimeout(r, 100));

  await t.test('1. Lock single file, then lock all files, then unlock all (no residual locks)', async () => {
    // Step 1: Host locks only single file "index.html"
    const lockSinglePromise = new Promise((resolve) => {
      clientSocket2.once('edit_lock_changed', resolve);
    });

    clientSocket1.emit('toggle_edit_lock', {
      roomId: room.id,
      isLocked: true,
      path: 'index.html',
      all: false
    });

    const singleData = await lockSinglePromise;
    assert.equal(singleData.isLocked, false, 'Global workspace isLocked should be false when only single file is locked');
    assert.ok(singleData.lockedFiles.includes('index.html'), 'lockedFiles must include index.html');
    assert.ok(!singleData.lockedFiles.includes('*'), 'lockedFiles must NOT include *');

    // Step 2: Host locks all files (full file / workspace lock)
    const lockAllPromise = new Promise((resolve) => {
      clientSocket2.once('edit_lock_changed', resolve);
    });

    clientSocket1.emit('toggle_edit_lock', {
      roomId: room.id,
      isLocked: true,
      all: true
    });

    const allData = await lockAllPromise;
    assert.equal(allData.isLocked, true, 'Global isLocked must be true');
    assert.ok(allData.lockedFiles.includes('*'), 'lockedFiles must contain *');

    // Step 3: Host unlocks edit / unlock all
    const unlockAllPromise = new Promise((resolve) => {
      clientSocket2.once('edit_lock_changed', resolve);
    });

    clientSocket1.emit('toggle_edit_lock', {
      roomId: room.id,
      isLocked: false,
      all: true
    });

    const unlockData = await unlockAllPromise;
    assert.equal(unlockData.isLocked, false, 'Global isLocked must be false');
    assert.equal(unlockData.lockedFiles.length, 0, 'lockedFiles must be completely empty! Single file must NOT linger in locked state.');
  });

  await t.test('2. WebRTC Audio Call Mesh: Join, Peer Discovery, Offer, Answer, ICE, Mute, Speaking & Leave', async () => {
    // A: Host joins audio call
    const hostExistingPromise = new Promise((resolve) => {
      clientSocket1.once('existing_audio_participants', resolve);
    });
    clientSocket1.emit('audio_join', { roomId: room.id });
    const hostExisting = await hostExistingPromise;
    assert.equal(hostExisting.peers.length, 0, 'Host is first in voice call');

    // B: Participant joins audio call -> Host receives peer_joined_audio, Participant receives existing peers
    const hostNotifiedPromise = new Promise((resolve) => {
      clientSocket1.once('peer_joined_audio', resolve);
    });
    const partExistingPromise = new Promise((resolve) => {
      clientSocket2.once('existing_audio_participants', resolve);
    });

    clientSocket2.emit('audio_join', { roomId: room.id });
    const [peerJoinedData, partExisting] = await Promise.all([
      hostNotifiedPromise,
      partExistingPromise
    ]);

    assert.equal(peerJoinedData.socketId, clientSocket2.id);
    assert.equal(peerJoinedData.displayName, 'ParticipantUser');
    assert.equal(partExisting.peers.length, 1);
    assert.equal(partExisting.peers[0].socketId, clientSocket1.id);
    assert.equal(partExisting.peers[0].displayName, 'HostUser');

    // C: Host initiates WebRTC Audio Offer to Participant
    const offerPromise = new Promise((resolve) => {
      clientSocket2.once('audio_offer', resolve);
    });
    const mockOfferSdp = { type: 'offer', sdp: 'v=0\r\no=mock-host 1 1 IN IP4 127.0.0.1\r\ns=audio\r\n' };
    clientSocket1.emit('audio_offer', {
      targetSocketId: clientSocket2.id,
      offer: mockOfferSdp
    });
    const offerReceived = await offerPromise;
    assert.equal(offerReceived.fromSocketId, clientSocket1.id);
    assert.equal(offerReceived.displayName, 'HostUser');
    assert.equal(offerReceived.offer.sdp, mockOfferSdp.sdp);

    // D: Participant sends WebRTC Audio Answer to Host
    const answerPromise = new Promise((resolve) => {
      clientSocket1.once('audio_answer', resolve);
    });
    const mockAnswerSdp = { type: 'answer', sdp: 'v=0\r\no=mock-part 2 2 IN IP4 127.0.0.1\r\ns=audio\r\n' };
    clientSocket2.emit('audio_answer', {
      targetSocketId: clientSocket1.id,
      answer: mockAnswerSdp
    });
    const answerReceived = await answerPromise;
    assert.equal(answerReceived.fromSocketId, clientSocket2.id);
    assert.equal(answerReceived.answer.sdp, mockAnswerSdp.sdp);

    // E: ICE Candidate Exchange (including mDNS unmasking for LAN/localhost)
    const iceCandidatePromise = new Promise((resolve) => {
      clientSocket2.once('audio_ice_candidate', resolve);
    });
    clientSocket1.emit('audio_ice_candidate', {
      targetSocketId: clientSocket2.id,
      candidate: {
        candidate: 'candidate:1 1 UDP 2122260223 127.0.0.1 54321 typ host',
        sdpMid: '0',
        sdpMLineIndex: 0
      }
    });
    const iceCandidateReceived = await iceCandidatePromise;
    assert.equal(iceCandidateReceived.fromSocketId, clientSocket1.id);
    assert.ok(iceCandidateReceived.candidate.candidate.includes('127.0.0.1'));

    // F: Microphone Mute and Unmute Toggle Signaling
    const mutePromise = new Promise((resolve) => {
      clientSocket2.once('peer_mute_state', resolve);
    });
    clientSocket1.emit('audio_mute_state', { roomId: room.id, isMuted: true });
    const muteReceived = await mutePromise;
    assert.equal(muteReceived.socketId, clientSocket1.id);
    assert.equal(muteReceived.isMuted, true);

    const unmutePromise = new Promise((resolve) => {
      clientSocket2.once('peer_mute_state', resolve);
    });
    clientSocket1.emit('audio_mute_state', { roomId: room.id, isMuted: false });
    const unmuteReceived = await unmutePromise;
    assert.equal(unmuteReceived.socketId, clientSocket1.id);
    assert.equal(unmuteReceived.isMuted, false);

    // G: Audio Speaking Activity State Signaling
    const speakingPromise = new Promise((resolve) => {
      clientSocket2.once('peer_speaking_state', resolve);
    });
    clientSocket1.emit('audio_speaking_state', { roomId: room.id, isSpeaking: true });
    const speakingReceived = await speakingPromise;
    assert.equal(speakingReceived.socketId, clientSocket1.id);
    assert.equal(speakingReceived.isSpeaking, true);

    // H: Participant leaves voice call
    const leavePromise = new Promise((resolve) => {
      clientSocket1.once('peer_left_audio', resolve);
    });
    clientSocket2.emit('audio_leave', { roomId: room.id });
    const leaveReceived = await leavePromise;
    assert.equal(leaveReceived.socketId, clientSocket2.id);
  });

  t.after(() => {
    clientSocket1.disconnect();
    clientSocket2.disconnect();
    server.close();
  });
});
