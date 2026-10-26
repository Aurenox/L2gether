import test from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase, query } from '../src/database/db.js';
import {
  createGuestSession,
  createRoom,
  getRoomDetails,
  joinRoom,
  authenticateOwner,
  getPendingJoinRequests
} from '../src/services/roomService.js';
import { executeCode, extractProblems } from '../src/services/executionService.js';
import { runRoomExpirationCleanup } from '../src/workers/cleanupWorker.js';

test('L2gether Backend Test Suite', async (t) => {
  await initDatabase();

  let guestSession = null;
  let testRoom = null;

  await t.test('1. Guest session creation without mandatory account registration', async () => {
    guestSession = await createGuestSession('AlexDev');
    assert.ok(guestSession.sessionId, 'Session ID should be generated');
    assert.ok(guestSession.token, 'Session token should be generated');
    assert.equal(guestSession.displayName, 'AlexDev');
    assert.ok(new Date(guestSession.expiresAt) > new Date(), 'Expiry should be in the future');
  });

  await t.test('2. Room creation with exact 7-day lifecycle and starter project', async () => {
    testRoom = await createRoom({
      name: 'Alpha Team Workspace',
      description: 'Collaborative coding space',
      visibility: 'public',
      ownerSessionId: guestSession.sessionId,
      templateType: 'web'
    });

    assert.ok(testRoom.id.startsWith('room-'), 'Room ID should have room- prefix');
    assert.equal(testRoom.visibility, 'public');

    const details = await getRoomDetails(testRoom.id, guestSession.sessionId);
    assert.equal(details.name, 'Alpha Team Workspace');
    assert.equal(details.isOwner, true);
    assert.equal(details.isMember, true);
    assert.equal(details.isExpired, false);

    // Verify 7-day expiry
    const createdTime = new Date(details.createdAt).getTime();
    const expiresTime = new Date(details.expiresAt).getTime();
    const diffDays = Math.round((expiresTime - createdTime) / (1000 * 60 * 60 * 24));
    assert.equal(diffDays, 7, 'Room must expire in exactly 7 days');

    // Verify default workspace files exist
    const { rows: files } = await query(
      `SELECT path FROM workspace_files WHERE workspace_id = $1`,
      [testRoom.workspaceId]
    );
    const filePaths = files.map(f => f.path);
    assert.ok(filePaths.includes('index.html'), 'Should initialize index.html');
    assert.ok(filePaths.includes('styles.css'), 'Should initialize styles.css');
    assert.ok(filePaths.includes('script.js'), 'Should initialize script.js');
  });

  await t.test('3. Second guest joining public room', async () => {
    const guest2 = await createGuestSession('JordanCollab');
    const joinRes = await joinRoom({ roomId: testRoom.id, sessionId: guest2.sessionId });

    assert.equal(joinRes.status, 'joined');
    assert.equal(joinRes.role, 'participant');

    const updatedDetails = await getRoomDetails(testRoom.id, guest2.sessionId);
    assert.equal(updatedDetails.isMember, true);
    assert.equal(updatedDetails.isOwner, false);
    assert.equal(updatedDetails.participantCount, 2);
  });

  await t.test('4. Private room approval workflow', async () => {
    const privateRoom = await createRoom({
      name: 'Secret Project',
      visibility: 'private',
      ownerSessionId: guestSession.sessionId
    });

    const guest3 = await createGuestSession('Stranger');
    const joinRes = await joinRoom({ roomId: privateRoom.id, sessionId: guest3.sessionId });

    assert.equal(joinRes.status, 'pending', 'Private room join must be pending approval');
  });

  await t.test('5. Safe isolated code execution (JavaScript)', async () => {
    const res = await executeCode({
      language: 'javascript',
      code: 'console.log("Hello L2gether!"); console.log(2 + 2);'
    });

    assert.equal(res.success, true);
    assert.ok(res.stdout.includes('Hello L2gether!'));
    assert.ok(res.stdout.includes('4'));
    assert.equal(res.exitCode, 0);
  });

  await t.test('6. Safe isolated code execution (Python)', async () => {
    const res = await executeCode({
      language: 'python',
      code: 'print("Python isolated execution test:", 10 * 10)'
    });

    assert.equal(res.success, true);
    assert.ok(res.stdout.includes('Python isolated execution test: 100'));
    assert.equal(res.exitCode, 0);
  });

  await t.test('7. Problems extraction on syntax error', async () => {
    const problems = extractProblems(
      'File "main.py", line 3\n    print("unclosed\nSyntaxError: EOL while scanning string literal',
      '',
      'python'
    );

    assert.ok(problems.length > 0);
    assert.equal(problems[0].line, 3);
    assert.equal(problems[0].severity, 'error');
  });

  await t.test('8. Seven-day room lifecycle expiration reconciliation', async () => {
    // Artificially age a room to test expiration
    const expiredRoom = await createRoom({
      name: 'Old Temporary Room',
      ownerSessionId: guestSession.sessionId
    });

    // Set expiry in the past
    await query(
      `UPDATE rooms SET expires_at = '2020-01-01T00:00:00.000Z' WHERE id = $1`,
      [expiredRoom.id]
    );

    const cleanupRes = await runRoomExpirationCleanup();
    assert.ok(cleanupRes.cleanedCount >= 1, 'Should expire the outdated room');

    const details = await getRoomDetails(expiredRoom.id);
    assert.equal(details.status, 'expired');
    assert.equal(details.isExpired, true);
  });

  await t.test('9. Room creation with owner password and high-entropy recovery key', async () => {
    const creator = await createGuestSession('RoomCreatorMaster');
    const pwdRoom = await createRoom({
      name: 'Secure Vault Workspace',
      visibility: 'private',
      ownerSessionId: creator.sessionId,
      ownerPassword: 'SuperSecretHostPassword123!'
    });

    assert.equal(pwdRoom.hasPassword, true, 'Room should report password set');
    assert.ok(pwdRoom.recoveryKey, 'Recovery key must be generated');
    assert.match(pwdRoom.recoveryKey, /^L2G-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}-[A-Z0-9]{4}$/, 'Recovery key must match high-entropy format');

    // Verify hash stored in db, not plain text
    const { rows } = await query(`SELECT owner_password_hash, owner_recovery_key_hash FROM rooms WHERE id = $1`, [pwdRoom.id]);
    assert.ok(rows[0].owner_password_hash, 'Password hash should be stored');
    assert.ok(rows[0].owner_password_hash.includes(':'), 'Scrypt hash must contain salt and hash separated by colon');
    assert.ok(!rows[0].owner_password_hash.includes('SuperSecretHostPassword123!'), 'Plain password must NEVER be stored');
    assert.ok(rows[0].owner_recovery_key_hash, 'Recovery key hash must be stored');
  });

  await t.test('10. Owner authentication on new device/session using password', async () => {
    const originalCreator = await createGuestSession('CreatorSession1');
    const secureRoom = await createRoom({
      name: 'Cross-Device Workspace',
      visibility: 'private',
      ownerSessionId: originalCreator.sessionId,
      ownerPassword: 'MyStrongRoomPassword456'
    });

    // Creator opens room on laptop / second browser with a new session
    const returningDeviceSession = await createGuestSession('CreatorOnLaptop');
    const authRes = await authenticateOwner({
      roomId: secureRoom.id,
      password: 'MyStrongRoomPassword456',
      sessionId: returningDeviceSession.sessionId
    });

    assert.equal(authRes.success, true, 'Owner authentication should succeed with correct password');
    assert.equal(authRes.role, 'owner');
    assert.equal(authRes.room.isOwner, true, 'Returning session must now be recognized as room owner');
    assert.equal(authRes.room.ownerSessionId, returningDeviceSession.sessionId, 'Room owner session must be bound to new session');
  });

  await t.test('11. Owner authentication using recovery key', async () => {
    const creator = await createGuestSession('CreatorWithKey');
    const keyRoom = await createRoom({
      name: 'Emergency Recoverable Workspace',
      visibility: 'private',
      ownerSessionId: creator.sessionId,
      ownerPassword: 'ForgottenPassword123'
    });

    const recoveredDeviceSession = await createGuestSession('CreatorAfterPasswordLoss');
    const authRes = await authenticateOwner({
      roomId: keyRoom.id,
      recoveryKey: keyRoom.recoveryKey,
      sessionId: recoveredDeviceSession.sessionId
    });

    assert.equal(authRes.success, true, 'Owner authentication must succeed with recovery key');
    assert.equal(authRes.role, 'owner');
    assert.equal(authRes.room.isOwner, true);
  });

  await t.test('12. Rejection of invalid host credentials', async () => {
    const creator = await createGuestSession('LegitOwner');
    const room = await createRoom({
      name: 'Protected Room',
      ownerSessionId: creator.sessionId,
      ownerPassword: 'CorrectPassword999'
    });

    const imposterSession = await createGuestSession('Imposter');
    const wrongPwdRes = await authenticateOwner({
      roomId: room.id,
      password: 'WrongPassword!',
      sessionId: imposterSession.sessionId
    });

    assert.equal(wrongPwdRes.success, false);
    assert.equal(wrongPwdRes.code, 'INVALID_CREDENTIALS');

    const wrongKeyRes = await authenticateOwner({
      roomId: room.id,
      recoveryKey: 'L2G-0000-0000-0000-0000',
      sessionId: imposterSession.sessionId
    });

    assert.equal(wrongKeyRes.success, false);
    assert.equal(wrongKeyRes.code, 'INVALID_CREDENTIALS');
  });

  await t.test('13. Offline owner workflow: pending requests stored on server and approved upon return', async () => {
    // 1. Owner creates private room
    const ownerSess = await createGuestSession('OfflineOwner');
    const room = await createRoom({
      name: 'Offline Approvals Room',
      visibility: 'private',
      ownerSessionId: ownerSess.sessionId,
      ownerPassword: 'OwnerSecretPassword777'
    });

    // 2. Owner disconnects / goes offline.
    // 3. Guest arrives while owner is offline and submits join request
    const guestSess = await createGuestSession('WaitingCandidate');
    const joinAttempt1 = await joinRoom({ roomId: room.id, sessionId: guestSess.sessionId });
    assert.equal(joinAttempt1.status, 'pending', 'Guest request must be saved as pending in database');

    // 4. Owner returns on a new session/device and authenticates
    const ownerReturnSess = await createGuestSession('ReturningOwner');
    const authRes = await authenticateOwner({
      roomId: room.id,
      password: 'OwnerSecretPassword777',
      sessionId: ownerReturnSess.sessionId
    });
    assert.equal(authRes.success, true);

    // 5. Owner retrieves pending requests persisted on the server
    const pendingRequests = await getPendingJoinRequests(room.id);
    assert.equal(pendingRequests.length, 1);
    assert.equal(pendingRequests[0].session_id, guestSess.sessionId);
    assert.equal(pendingRequests[0].display_name, 'WaitingCandidate');

    // 6. Owner approves the pending request
    await query(
      `UPDATE join_requests SET status = 'approved', reviewed_at = CURRENT_TIMESTAMP, reviewed_by = $1 WHERE id = $2`,
      [ownerReturnSess.sessionId, pendingRequests[0].id]
    );

    // 7. Guest joins again now that approval is recorded
    const joinAttempt2 = await joinRoom({ roomId: room.id, sessionId: guestSess.sessionId });
    assert.equal(joinAttempt2.status, 'joined', 'Approved guest must immediately join room');
    assert.equal(joinAttempt2.role, 'participant');
  });
});

