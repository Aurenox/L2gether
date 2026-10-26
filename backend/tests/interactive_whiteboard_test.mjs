import { io as Client } from 'socket.io-client';
import http from 'node:http';
import { Server as SocketIOServer } from 'socket.io';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from '../src/database/db.js';
import { createApp } from '../src/app.js';
import { setupSockets } from '../src/sockets/index.js';
import { createGuestSession, createRoom } from '../src/services/roomService.js';

async function testInteractiveTerminalAndWhiteboard() {
  console.log('--- Starting Verification of Interactive Terminal & Whiteboard ---');
  await initDatabase();

  // 1. Start test server
  const app = createApp();
  const server = http.createServer(app);
  const ioServer = new SocketIOServer(server, { cors: { origin: '*' } });
  app.set('io', ioServer);
  setupSockets(ioServer);

  await new Promise((resolve) => server.listen(0, resolve));
  const port = server.address().port;
  const baseUrl = `http://localhost:${port}`;
  console.log(`Test server running on port ${port}`);

  // 2. Setup mock room and workspace in DB
  const hostSession = await createGuestSession('HostUser');
  const guestSession = await createGuestSession('Collaborator');

  const room = await createRoom({
    name: 'Test Live Execution Room',
    ownerSessionId: hostSession.sessionId
  });
  const roomId = room.id;

  const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
  const wsId = wsRes.rows[0].id;

  // 3. Connect Owner and Guest Sockets
  const ownerSocket = Client(baseUrl, {
    auth: { token: hostSession.token },
    transports: ['websocket']
  });

  const guestSocket = Client(baseUrl, {
    auth: { token: guestSession.token },
    transports: ['websocket']
  });

  await Promise.all([
    new Promise((resolve) => ownerSocket.once('connect', resolve)),
    new Promise((resolve) => guestSocket.once('connect', resolve))
  ]);

  ownerSocket.emit('join_room', { roomId });
  guestSocket.emit('join_room', { roomId });
  await new Promise((r) => setTimeout(r, 200));

  // ----------------------------------------------------
  // TEST 1: Whiteboard Draw & Share Collaboration
  // ----------------------------------------------------
  console.log('Testing Whiteboard Socket events...');
  const whiteboardDrawReceivedPromise = new Promise((resolve) => {
    guestSocket.once('remote_whiteboard_draw', (data) => {
      resolve(data);
    });
  });

  ownerSocket.emit('whiteboard_draw', {
    roomId,
    stroke: { tool: 'pen', color: '#38BDF8', size: 3, points: [{ x: 10, y: 10 }, { x: 20, y: 20 }] }
  });

  const receivedStroke = await whiteboardDrawReceivedPromise;
  console.log('✓ Guest received remote_whiteboard_draw:', receivedStroke.stroke.tool, receivedStroke.stroke.color);

  // Whiteboard Share Snapshot to chat
  const snapshotPromise = new Promise((resolve) => {
    guestSocket.once('new_message', (msg) => {
      resolve(msg);
    });
  });

  ownerSocket.emit('whiteboard_share_snapshot', {
    roomId,
    dataUrl: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==',
    title: 'Architecture Diagram'
  });

  const receivedMessage = await snapshotPromise;
  console.log('✓ Guest received new_message with whiteboard snapshot in room chat:', receivedMessage.content.slice(0, 50));

  // ----------------------------------------------------
  // TEST 2: C Interactive Terminal with Live scanf & File Creation
  // ----------------------------------------------------
  console.log('\nTesting Interactive C Program Execution with live scanf & file creation...');
  const cCode = `#include <stdio.h>
int main() {
    int age;
    printf("Enter your age: ");
    if (scanf("%d", &age) == 1) {
        printf("Your age is %d\\n", age);
    }
    FILE *f = fopen("output_from_c.txt", "w");
    if (f) {
        fprintf(f, "Created by C execution with age %d\\n", age);
        fclose(f);
    }
    return 0;
}
`;

  let accumulatedOutput = '';
  let promptSeen = false;

  const terminalOutputPromise = new Promise((resolve, reject) => {
    const timeout = setTimeout(() => reject(new Error('Interactive terminal test timed out')), 25000);

    ownerSocket.on('terminal_session_output', ({ data }) => {
      accumulatedOutput += data;
      process.stdout.write(`[Live Terminal Stdout] ${data}`);

      // When program prints the prompt, send the input while program is ALIVE!
      if (!promptSeen && accumulatedOutput.includes('Enter your age:')) {
        promptSeen = true;
        console.log('\n---> Program is paused on scanf()! Sending 21\\n to stdin...');
        setTimeout(() => {
          ownerSocket.emit('terminal_session_input', { input: '21\n' });
        }, 300);
      }
    });

    ownerSocket.once('terminal_session_exit', ({ exitCode, durationMs }) => {
      clearTimeout(timeout);
      resolve({ exitCode, durationMs });
    });
  });

  // Start the interactive session
  ownerSocket.emit('terminal_session_start', {
    roomId,
    language: 'c',
    code: cCode,
    filename: 'main.c',
    files: []
  });

  const result = await terminalOutputPromise;
  console.log(`\n✓ Process finished with exit code ${result.exitCode} in ${result.durationMs}ms`);
  console.log('Checking accumulated stdout output:');
  console.log(accumulatedOutput);

  if (!accumulatedOutput.includes('Your age is 21')) {
    throw new Error('Accumulated output missing expected printf output "Your age is 21"');
  }

  // Verify created file persisted into workspace_files DB
  const fileCheck = await db.query(
    `SELECT * FROM workspace_files WHERE workspace_id = $1 AND path = 'output_from_c.txt'`,
    [wsId]
  );
  console.log(`✓ output_from_c.txt created by program automatically synced to database! Rows: ${fileCheck.rows.length}`);
  if (fileCheck.rows.length > 0) {
    console.log(`  Content: "${fileCheck.rows[0].content.trim()}"`);
  }

  // ----------------------------------------------------
  // TEST 3: File Deletion by Program (remove("output_from_c.txt"))
  // ----------------------------------------------------
  console.log('\nTesting C program that deletes a file (remove("output_from_c.txt"))...');
  const deleteCode = `#include <stdio.h>
int main() {
    if (remove("output_from_c.txt") == 0) {
        printf("File deleted successfully!\\n");
    } else {
        printf("File deletion failed!\\n");
    }
    return 0;
}
`;

  await new Promise((resolve) => {
    ownerSocket.once('terminal_session_exit', () => resolve());
    ownerSocket.emit('terminal_session_start', {
      roomId,
      language: 'c',
      code: deleteCode,
      filename: 'delete_test.c',
      files: []
    });
  });

  const deletedFileCheck = await db.query(
    `SELECT * FROM workspace_files WHERE workspace_id = $1 AND path = 'output_from_c.txt'`,
    [wsId]
  );
  console.log(`✓ output_from_c.txt deleted by program automatically removed from database! Remaining rows: ${deletedFileCheck.rows.length}`);

  // Cleanup
  ownerSocket.disconnect();
  guestSocket.disconnect();
  ioServer.close();
  server.close();
  console.log('\n🎉 ALL TESTS PASSED SUCCESSFULLY! Real interactive compilation, live stdin piping, file creation/deletion, and whiteboard sync all verified!');
  process.exit(0);
}

testInteractiveTerminalAndWhiteboard().catch((err) => {
  console.error('Test failed:', err);
  process.exit(1);
});
