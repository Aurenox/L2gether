import { test, describe, before } from 'node:test';
import assert from 'node:assert/strict';
import { initDatabase } from '../src/database/db.js';
import { executeCode, checkSystemCompilers, executeTerminalCommand } from '../src/services/executionService.js';
import { installPackage, uninstallPackage } from '../src/services/packageService.js';
import { createGuestSession, createRoom } from '../src/services/roomService.js';

describe('GCC, Python & Smart Package Manager Tests', () => {
  before(async () => {
    await initDatabase();
  });
  test('1. System compilers report GCC and Python readiness', () => {
    const compilers = checkSystemCompilers();
    assert.equal(compilers.gcc.installed, true);
    assert.ok(compilers.gcc.version);
    assert.equal(compilers.python.installed, true);
    assert.ok(compilers.python.version);
    assert.equal(compilers.node.installed, true);
  });

  test('2. C code execution works via zero-config dual engine', async () => {
    const res = await executeCode({
      language: 'c',
      code: '#include <stdio.h>\nint main() { printf("L2gether C is working!\\n"); return 0; }'
    });
    assert.equal(res.success, true);
    assert.ok(res.stdout.includes('L2gether C is working!'));
    assert.equal(res.exitCode, 0);
  });

  test('3. Python code execution works seamlessly', async () => {
    const res = await executeCode({
      language: 'python',
      code: 'print("L2gether Python is working!")'
    });
    assert.equal(res.success, true);
    assert.ok(res.stdout.includes('L2gether Python is working!'));
    assert.equal(res.exitCode, 0);
  });

  test('4. Terminal GCC compilation, binary execution, and interactive input', async () => {
    const roomId = 'test_term_room';
    const cSource = `#include <stdio.h>
int main() {
  int num;
  if (scanf("%d", &num) == 1) {
    printf("Terminal Input Doubled: %d\\n", num * 2);
  } else {
    printf("Terminal GCC Binary works!\\n");
  }
  return 0;
}`;

    const compileRes = await executeTerminalCommand({
      commandLine: 'gcc main.c -o a.out',
      roomId,
      workspaceFiles: [{ path: 'main.c', content: cSource }]
    });
    assert.equal(compileRes.exitCode, 0);
    assert.ok(compileRes.stdout.includes('Compilation successful'));

    // 1. Regular execution (no stdin)
    const runRes = await executeTerminalCommand({
      commandLine: './a.out',
      roomId,
      workspaceFiles: [{ path: 'main.c', content: cSource }]
    });
    assert.equal(runRes.exitCode, 0);
    assert.ok(runRes.stdout.includes('Terminal GCC Binary works!'));

    // 2. Interactive execution with stdin value
    const inputRes = await executeTerminalCommand({
      commandLine: './a.out',
      roomId,
      workspaceFiles: [{ path: 'main.c', content: cSource }],
      stdin: '25\n'
    });
    assert.equal(inputRes.exitCode, 0);
    assert.ok(inputRes.stdout.includes('Terminal Input Doubled: 50'));

    // 3. Piped terminal input: echo "35" | ./a.out
    const pipeRes = await executeTerminalCommand({
      commandLine: 'echo "35" | ./a.out',
      roomId,
      workspaceFiles: [{ path: 'main.c', content: cSource }]
    });
    assert.equal(pipeRes.exitCode, 0);
    assert.ok(pipeRes.stdout.includes('Terminal Input Doubled: 70'));

    // 4. Here-string terminal input: ./a.out <<< "45"
    const hereRes = await executeTerminalCommand({
      commandLine: './a.out <<< "45"',
      roomId,
      workspaceFiles: [{ path: 'main.c', content: cSource }]
    });
    assert.equal(hereRes.exitCode, 0);
    assert.ok(hereRes.stdout.includes('Terminal Input Doubled: 90'));
  });

  test('5. Smart Package Manager install and clean removal with workspace manifest synchronization', async () => {
    const session = await createGuestSession('PkgDev');
    const room = await createRoom({
      name: 'Package Manifest Sync Room',
      description: 'Testing install and removal',
      ownerSessionId: session.sessionId,
      templateType: 'web'
    });

    // 1. Install Tailwind CSS CDN
    const installRes = await installPackage(room.id, {
      packageName: 'Tailwind CSS',
      version: '3.4.1',
      environment: 'cdn'
    });
    assert.ok(installRes.success);
    const indexHtml = installRes.files.find((f) => f.path === 'index.html');
    assert.ok(indexHtml && indexHtml.content.includes('tailwindcss'));

    // 2. Install pip package (should generate/update requirements.txt)
    const pipRes = await installPackage(room.id, {
      packageName: 'requests',
      version: 'latest',
      environment: 'pip'
    });
    assert.ok(pipRes.success);
    const reqTxt = pipRes.files.find((f) => f.path === 'requirements.txt');
    assert.ok(reqTxt && reqTxt.content.includes('requests'));

    // 3. Uninstall Tailwind CSS (removes from index.html)
    const uninstallCdnRes = await uninstallPackage(room.id, {
      packageName: 'Tailwind CSS',
      environment: 'cdn'
    });
    assert.ok(uninstallCdnRes.success);
    const updatedHtml = uninstallCdnRes.files.find((f) => f.path === 'index.html');
    assert.ok(updatedHtml && !updatedHtml.content.includes('tailwindcss'));

    // 4. Uninstall pip package (removes from requirements.txt)
    const uninstallPipRes = await uninstallPackage(room.id, {
      packageName: 'requests',
      environment: 'pip'
    });
    assert.ok(uninstallPipRes.success);
    const updatedReqTxt = uninstallPipRes.files.find((f) => f.path === 'requirements.txt');
    assert.ok(updatedReqTxt && !updatedReqTxt.content.includes('requests'));
  });
});
