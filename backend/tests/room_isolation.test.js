import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { io as ClientIO } from 'socket.io-client';
import { Server as SocketIOServer } from 'socket.io';
import { initDatabase } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { setupSockets } from '../src/sockets/index.js';
import { createGuestSession, createRoom } from '../src/services/roomService.js';

test('Strict Cross-Room Isolation Test Suite', async (t) => {
  await initDatabase();
  const app = createApp();
  const server = http.createServer(app);
  const io = new SocketIOServer(server, { cors: { origin: '*' } });
  setupSockets(io);
  app.set('io', io);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const serverUrl = `http://localhost:${port}`;

  // 1. Create two separate rooms with distinct users
  // Room 1: Host1 and Part1
  const host1 = await createGuestSession('HostRoom1');
  const part1 = await createGuestSession('PartRoom1');

  const room1 = await createRoom({
    name: 'Room 1 (Alpha)',
    description: 'First isolated room',
    visibility: 'public',
    ownerSessionId: host1.sessionId
  });

  // Part1 joins Room 1 via REST API
  await fetch(`${serverUrl}/api/rooms/${room1.id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Token': part1.token }
  });

  // Room 2: Host2 and Part2
  const host2 = await createGuestSession('HostRoom2');
  const part2 = await createGuestSession('PartRoom2');

  const room2 = await createRoom({
    name: 'Room 2 (Beta)',
    description: 'Second isolated room',
    visibility: 'public',
    ownerSessionId: host2.sessionId
  });

  // Part2 joins Room 2 via REST API
  await fetch(`${serverUrl}/api/rooms/${room2.id}/join`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Session-Token': part2.token }
  });

  // 2. Connect client sockets
  const socket1Host = ClientIO(serverUrl, { auth: { token: host1.token }, transports: ['websocket'] });
  const socket1Part = ClientIO(serverUrl, { auth: { token: part1.token }, transports: ['websocket'] });
  const socket2Host = ClientIO(serverUrl, { auth: { token: host2.token }, transports: ['websocket'] });
  const socket2Part = ClientIO(serverUrl, { auth: { token: part2.token }, transports: ['websocket'] });

  await Promise.all([
    new Promise((res) => socket1Host.on('connect', res)),
    new Promise((res) => socket1Part.on('connect', res)),
    new Promise((res) => socket2Host.on('connect', res)),
    new Promise((res) => socket2Part.on('connect', res))
  ]);

  socket1Host.emit('join_room', { roomId: room1.id });
  socket1Part.emit('join_room', { roomId: room1.id });
  socket2Host.emit('join_room', { roomId: room2.id });
  socket2Part.emit('join_room', { roomId: room2.id });

  await new Promise((r) => setTimeout(r, 150));

  await t.test('1. Cross-room Chat Isolation: Room 1 chat cannot leak into Room 2', async () => {
    let room2ReceivedMessage = false;
    socket2Host.on('new_message', () => { room2ReceivedMessage = true; });
    socket2Part.on('new_message', () => { room2ReceivedMessage = true; });

    const room1PartReceivedPromise = new Promise((resolve) => {
      socket1Part.once('new_message', resolve);
    });

    // Host 1 sends message in Room 1
    socket1Host.emit('send_message', {
      roomId: room1.id,
      content: 'Secret confidential message in Room 1'
    });

    const msg = await room1PartReceivedPromise;
    assert.equal(msg.content, 'Secret confidential message in Room 1');

    await new Promise((r) => setTimeout(r, 100));
    assert.equal(room2ReceivedMessage, false, 'Room 2 sockets must NOT receive Room 1 messages!');
  });

  await t.test('2. Cross-room Code Editing & File Tree Isolation', async () => {
    let room2ReceivedCodeChange = false;
    let room2ReceivedFileCreated = false;

    socket2Part.on('remote_code_change', () => { room2ReceivedCodeChange = true; });
    socket2Part.on('remote_file_created', () => { room2ReceivedFileCreated = true; });

    const room1PartCodePromise = new Promise((resolve) => {
      socket1Part.once('remote_code_change', resolve);
    });
    const room1PartFilePromise = new Promise((resolve) => {
      socket1Part.once('remote_file_created', resolve);
    });

    socket1Host.emit('code_change', {
      roomId: room1.id,
      path: 'index.html',
      content: '<h1>Room 1 Exclusive Content</h1>'
    });

    socket1Host.emit('file_created', {
      roomId: room1.id,
      file: { path: 'room1_private.js', content: 'console.log(1);' }
    });

    await Promise.all([room1PartCodePromise, room1PartFilePromise]);
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(room2ReceivedCodeChange, false, 'Room 2 must NOT receive Room 1 code changes!');
    assert.equal(room2ReceivedFileCreated, false, 'Room 2 must NOT receive Room 1 file creations!');
  });

  await t.test('3. Cross-room WebRTC Audio Signaling Isolation', async () => {
    let room2ReceivedPeerJoin = false;
    let room2ReceivedOffer = false;

    socket2Part.on('peer_joined_audio', () => { room2ReceivedPeerJoin = true; });
    socket2Part.on('audio_offer', () => { room2ReceivedOffer = true; });

    // Host 1 joins voice call in Room 1
    socket1Host.emit('audio_join', { roomId: room1.id });

    // Host 1 maliciously tries to send direct audio_offer to socket2Part (who is in Room 2)
    socket1Host.emit('audio_offer', {
      targetSocketId: socket2Part.id,
      offer: { type: 'offer', sdp: 'cross-room-leak-attempt' }
    });

    await new Promise((r) => setTimeout(r, 150));

    assert.equal(room2ReceivedPeerJoin, false, 'Room 2 sockets must NOT receive Room 1 audio join notifications!');
    assert.equal(room2ReceivedOffer, false, 'Direct audio offer must NOT be relayed across different rooms!');
  });

  await t.test('4. Cross-room Whiteboard Collaboration Isolation', async () => {
    let room2ReceivedWhiteboard = false;
    socket2Part.on('remote_whiteboard_draw', () => { room2ReceivedWhiteboard = true; });

    const room1WhiteboardPromise = new Promise((resolve) => {
      socket1Part.once('remote_whiteboard_draw', resolve);
    });

    socket1Host.emit('whiteboard_draw', {
      roomId: room1.id,
      stroke: { tool: 'pen', points: [{ x: 10, y: 10 }] }
    });

    await room1WhiteboardPromise;
    await new Promise((r) => setTimeout(r, 100));

    assert.equal(room2ReceivedWhiteboard, false, 'Room 2 sockets must NOT receive Room 1 whiteboard strokes!');
  });

  await t.test('5. Cross-room REST API Access Rejection (HTTP 403 NOT_A_MEMBER)', async () => {
    // User in Room 2 attempts to fetch Room 1 workspace files
    const res = await fetch(`${serverUrl}/api/rooms/${room1.id}/workspace`, {
      headers: { 'X-Session-Token': part2.token }
    });

    assert.equal(res.status, 403, 'Access to another room workspace without membership must return 403 Forbidden');
    const data = await res.json();
    assert.equal(data.code, 'NOT_A_MEMBER');
  });

  await t.test('6. Non-member socket cannot join unauthorized room', async () => {
    // Create a private room
    const privateRoom = await createRoom({
      name: 'Private Vault',
      description: 'Private locked room',
      visibility: 'private',
      ownerSessionId: host1.sessionId
    });

    const outsider = await createGuestSession('OutsiderUser');
    const outsiderSocket = ClientIO(serverUrl, { auth: { token: outsider.token }, transports: ['websocket'] });
    await new Promise((res) => outsiderSocket.on('connect', res));

    const errorPromise = new Promise((resolve) => {
      outsiderSocket.once('error_message', resolve);
    });

    outsiderSocket.emit('join_room', { roomId: privateRoom.id });
    const err = await errorPromise;
    assert.ok(err.message.includes('not an active participant'), 'Server must reject unapproved socket join');

    outsiderSocket.disconnect();
  });

  t.after(() => {
    socket1Host.disconnect();
    socket1Part.disconnect();
    socket2Host.disconnect();
    socket2Part.disconnect();
    server.close();
  });
});
