import { spawn } from 'node:child_process';
import { existsSync, mkdirSync, writeFileSync, readFileSync, readdirSync, statSync, unlinkSync } from 'node:fs';
import { join, dirname, relative } from 'node:path';
import { v4 as uuidv4 } from 'uuid';
import db from '../database/db.js';
import config from '../config/index.js';
import { detectGccCommand, detectPythonCommand, executeViaWandbox, RUNNER_DIR } from './executionService.js';

// Map of active interactive terminal sessions: socketId -> session
const activeSessions = new Map();

/**
 * Recursively scans directory and builds a map of relative file paths and modification times
 */
function scanDirectoryFiles(dir, base = dir) {
  const fileMap = new Map();
  if (!existsSync(dir)) return fileMap;

  const entries = readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      const sub = scanDirectoryFiles(fullPath, base);
      for (const [k, v] of sub.entries()) {
        fileMap.set(k, v);
      }
    } else if (entry.isFile()) {
      const relPath = relative(base, fullPath).replace(/\\/g, '/');
      // Ignore compiled binaries, runner artifacts, or temp executables
      if (!relPath.endsWith('.exe') && !relPath.endsWith('.out') && !relPath.endsWith('.o') && !relPath.includes('.runner.json') && !relPath.includes('__l2gether_unbuffer.h')) {
        try {
          const stat = statSync(fullPath);
          fileMap.set(relPath, { mtimeMs: stat.mtimeMs, size: stat.size });
        } catch (e) {}
      }
    }
  }
  return fileMap;
}

/**
 * Synchronizes workspace files created, modified, or deleted by a program run back to the DB and room
 */
async function syncWorkspaceFilesAfterExecution({ roomId, roomRunnerDir, initialFilesMap, io }) {
  if (!roomId || !existsSync(roomRunnerDir)) return [];

  // Resolve workspace ID for this room
  let workspaceId = null;
  try {
    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length > 0) {
      workspaceId = wsRes.rows[0].id;
    }
  } catch (e) {
    console.warn('[Terminal File Sync WS Error]', e.message);
  }

  if (!workspaceId) return [];

  const currentFilesMap = scanDirectoryFiles(roomRunnerDir);
  const changedFiles = [];

  // 1. Detect Newly Created & Modified Files
  for (const [relPath, info] of currentFilesMap.entries()) {
    const fullPath = join(roomRunnerDir, relPath);
    let content = '';
    try {
      content = readFileSync(fullPath, 'utf-8');
    } catch (e) {
      continue;
    }

    const prev = initialFilesMap.get(relPath);
    if (!prev) {
      // Newly created file by program (e.g. data.txt created by fopen("data.txt", "w") or open(...))
      const fileId = `file_${uuidv4().slice(0, 12)}`;
      try {
        await db.query(
          `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory)
           VALUES ($1, $2, $3, $4, 0)
           ON CONFLICT(workspace_id, path) DO UPDATE SET content = $4, updated_at = datetime('now')`,
          [fileId, workspaceId, relPath, content]
        );
        changedFiles.push({ path: relPath, action: 'created', content });

        if (io) {
          io.to(roomId).emit('remote_file_created', {
            file: { id: fileId, workspace_id: workspaceId, path: relPath, content, is_directory: 0 }
          });
        }
      } catch (e) {
        console.warn('[Sync New File Error]', e.message);
      }
    } else if (prev.mtimeMs !== info.mtimeMs || prev.size !== info.size) {
      // Modified file by program
      try {
        await db.query(
          `UPDATE workspace_files SET content = $1, updated_at = datetime('now')
           WHERE workspace_id = $2 AND path = $3`,
          [content, workspaceId, relPath]
        );
        changedFiles.push({ path: relPath, action: 'modified', content });

        if (io) {
          io.to(roomId).emit('remote_code_change', {
            path: relPath,
            content,
            senderDisplayName: 'Program Runner'
          });
        }
      } catch (e) {
        console.warn('[Sync Modified File Error]', e.message);
      }
    }
  }

  // 2. Detect Deleted Files (e.g. remove("data.txt") or os.remove("data.txt"))
  for (const [relPath] of initialFilesMap.entries()) {
    if (!currentFilesMap.has(relPath)) {
      try {
        await db.query(
          `DELETE FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
          [workspaceId, relPath]
        );
        changedFiles.push({ path: relPath, action: 'deleted' });

        if (io) {
          io.to(roomId).emit('remote_file_deleted', { path: relPath });
        }
      } catch (e) {
        console.warn('[Sync Deleted File Error]', e.message);
      }
    }
  }

  return changedFiles;
}

/**
 * Starts an interactive real-time terminal execution session over WebSockets
 */
export async function startInteractiveSession({
  socket,
  roomId,
  language = 'c',
  code = '',
  filename = '',
  command = '',
  files = [],
  io
}) {
  // If a session already exists for this socket, terminate it first
  stopInteractiveSession(socket.id);

  const cleanRoomId = (roomId || 'default').replace(/[^a-zA-Z0-9_-]/g, '_');
  const roomRunnerDir = join(RUNNER_DIR, `room_${cleanRoomId}`);
  if (!existsSync(roomRunnerDir)) {
    mkdirSync(roomRunnerDir, { recursive: true });
  }

  // 1. Sync all workspace files into roomRunnerDir
  if (Array.isArray(files)) {
    for (const f of files) {
      if (f && f.path) {
        const dest = join(roomRunnerDir, f.path);
        if (f.is_directory || f.isDirectory) {
          if (!existsSync(dest)) mkdirSync(dest, { recursive: true });
        } else if (typeof f.content === 'string') {
          const destDir = dirname(dest);
          if (!existsSync(destDir)) mkdirSync(destDir, { recursive: true });
          try {
            writeFileSync(dest, f.content, 'utf-8');
          } catch (e) {}
        }
      }
    }
  }

  // 2. Write active file code if provided
  const lang = (language || '').toLowerCase();
  const targetFile = filename || (lang === 'python' || lang === 'py' ? 'main.py' : 'main.c');
  if (code) {
    const targetPath = join(roomRunnerDir, targetFile);
    try {
      const dir = dirname(targetPath);
      if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
      writeFileSync(targetPath, code, 'utf-8');
    } catch (e) {}
  }

  // Snapshot initial files in runner directory for diff tracking
  const initialFilesMap = scanDirectoryFiles(roomRunnerDir);
  const startTime = Date.now();

  // 3. Compile (for C) or prepare Python runner
  const isC = lang === 'c' || targetFile.endsWith('.c') || command.startsWith('gcc') || command.startsWith('./');

  if (isC) {
    const nativeGcc = detectGccCommand();
    const outName = process.platform === 'win32' ? 'main.exe' : 'main';
    const outBinPath = join(roomRunnerDir, outName);

    // If native GCC is not available, run via Wandbox Cloud Fallback
    if (!nativeGcc) {
      socket.emit('terminal_session_output', {
        data: `[Zero-Config Cloud Engine] Compiling ${targetFile} via GCC 13.2 (C17)...\r\n`
      });

      const wandboxRes = await executeViaWandbox({
        language: 'c',
        code: code || (existsSync(join(roomRunnerDir, targetFile)) ? readFileSync(join(roomRunnerDir, targetFile), 'utf-8') : ''),
        stdin: '',
        files
      });

      if (wandboxRes.stderr && wandboxRes.stderr.includes('error:')) {
        socket.emit('terminal_session_output', { data: wandboxRes.stderr + '\r\n', isError: true });
        socket.emit('terminal_session_exit', { exitCode: 1, durationMs: wandboxRes.durationMs });
        return;
      }

      if (wandboxRes.stdout) {
        socket.emit('terminal_session_output', { data: wandboxRes.stdout });
      }

      socket.emit('terminal_session_exit', { exitCode: wandboxRes.exitCode, durationMs: wandboxRes.durationMs });
      return;
    }

    // Native GCC Compilation Phase
    // Discover any other .c source files in runner dir to support multi-file C projects
    const otherCFiles = [];
    const dirEntries = readdirSync(roomRunnerDir);
    for (const entry of dirEntries) {
      if (entry.endsWith('.c') && entry !== targetFile) {
        try {
          const fileContent = readFileSync(join(roomRunnerDir, entry), 'utf-8');
          // Only link helper modules that don't have their own main() function
          if (!/\bmain\s*\(/.test(fileContent)) {
            otherCFiles.push(join(roomRunnerDir, entry));
          }
        } catch (e) {}
      }
    }

    // Write unbuffer helper header so printf() without newline or fflush() flushes immediately to pipe for scanf
    const unbufferHeaderPath = join(roomRunnerDir, '__l2gether_unbuffer.h');
    try {
      writeFileSync(
        unbufferHeaderPath,
        `#ifndef _L2GETHER_UNBUFFER_H\n#define _L2GETHER_UNBUFFER_H\n#include <stdio.h>\n#ifdef __GNUC__\n__attribute__((constructor)) static void __l2gether_init_unbuffered_io(void) {\n    setvbuf(stdout, NULL, _IONBF, 0);\n    setvbuf(stderr, NULL, _IONBF, 0);\n}\n#endif\n#endif\n`,
        'utf-8'
      );
    } catch (e) {}

    const gccBin = nativeGcc.command;
    const compileArgs = [
      '-std=c17',
      '-O2',
      '-include',
      unbufferHeaderPath,
      '-Wall',
      '-Wextra',
      join(roomRunnerDir, targetFile),
      ...otherCFiles,
      '-I',
      roomRunnerDir,
      '-o',
      outBinPath,
      '-lm'
    ];

    socket.emit('terminal_session_output', {
      data: `$ gcc -std=c17 -O2 ${targetFile} -o ${outName} -lm\r\n`
    });

    const compileProc = spawn(gccBin, compileArgs, {
      cwd: roomRunnerDir,
      env: { ...process.env, PATH: process.env.PATH }
    });

    let compileStderr = '';
    compileProc.stderr.on('data', (d) => {
      compileStderr += d.toString();
    });

    compileProc.on('close', (compCode) => {
      if (compCode !== 0) {
        socket.emit('terminal_session_output', {
          data: compileStderr || `Compilation failed with exit code ${compCode}\r\n`,
          isError: true
        });
        socket.emit('terminal_session_exit', {
          exitCode: compCode,
          durationMs: Date.now() - startTime,
          isCompilationError: true
        });
        return;
      }

      // If warnings exist, show them
      if (compileStderr && compileStderr.trim()) {
        socket.emit('terminal_session_output', {
          data: compileStderr + '\r\n'
        });
      }

      // Execution Phase: Spawn the compiled executable!
      // KEEP STDIN OPEN SO SCANF WAITS FOR USER INPUT!
      socket.emit('terminal_session_output', {
        data: `$ ./${outName}\r\n`
      });

      let execProc;
      try {
        execProc = spawn(outBinPath, [], {
          cwd: roomRunnerDir,
          env: { ...process.env, PATH: process.env.PATH }
        });
      } catch (err) {
        socket.emit('terminal_session_output', {
          data: `Failed to launch executable: ${err.message}\r\n`,
          isError: true
        });
        socket.emit('terminal_session_exit', { exitCode: 1, durationMs: Date.now() - startTime });
        return;
      }

      // Register live session
      activeSessions.set(socket.id, {
        proc: execProc,
        roomRunnerDir,
        roomId,
        initialFilesMap,
        startTime: Date.now(),
        command: `$ ./${outName}`
      });

      // Stream stdout directly to browser
      execProc.stdout.on('data', (chunk) => {
        socket.emit('terminal_session_output', { data: chunk.toString() });
      });

      // Stream stderr directly to browser
      execProc.stderr.on('data', (chunk) => {
        socket.emit('terminal_session_output', { data: chunk.toString(), isError: true });
      });

      // Safety timeout (e.g. 60 seconds)
      const timeoutTimer = setTimeout(() => {
        if (!execProc.killed) {
          try { execProc.kill('SIGKILL'); } catch (e) {}
          socket.emit('terminal_session_output', {
            data: `\r\n[Execution Terminated: Timeout of 60 seconds exceeded]\r\n`,
            isError: true
          });
        }
      }, 60000);

      execProc.on('close', async (code) => {
        clearTimeout(timeoutTimer);
        const durationMs = Date.now() - startTime;
        activeSessions.delete(socket.id);

        // Sync created, modified, and deleted files to workspace
        const changedFiles = await syncWorkspaceFilesAfterExecution({
          roomId,
          roomRunnerDir,
          initialFilesMap,
          io
        });

        const statusText = code === 0
          ? `\r\n\x1b[32m✓ Process finished with exit code 0\x1b[0m (${durationMs}ms)\r\n`
          : `\r\n\x1b[31m✗ Process exited with code ${code ?? 1}\x1b[0m (${durationMs}ms)\r\n`;

        socket.emit('terminal_session_output', { data: statusText });
        socket.emit('terminal_session_exit', {
          exitCode: code ?? 0,
          durationMs,
          changedFiles
        });
      });

      execProc.on('error', (err) => {
        clearTimeout(timeoutTimer);
        activeSessions.delete(socket.id);
        socket.emit('terminal_session_output', {
          data: `\r\nExecution error: ${err.message}\r\n`,
          isError: true
        });
        socket.emit('terminal_session_exit', { exitCode: 1, durationMs: Date.now() - startTime });
      });
    });

    return;
  }

  // Python Execution Phase
  const nativePy = detectPythonCommand();
  if (!nativePy) {
    socket.emit('terminal_session_output', {
      data: `[Zero-Config Cloud Engine] Executing ${targetFile} via CPython 3.12...\r\n`
    });

    const wandboxRes = await executeViaWandbox({
      language: 'python',
      code: code || (existsSync(join(roomRunnerDir, targetFile)) ? readFileSync(join(roomRunnerDir, targetFile), 'utf-8') : ''),
      stdin: '',
      files
    });

    if (wandboxRes.stderr) {
      socket.emit('terminal_session_output', { data: wandboxRes.stderr + '\r\n', isError: true });
    }
    if (wandboxRes.stdout) {
      socket.emit('terminal_session_output', { data: wandboxRes.stdout });
    }

    socket.emit('terminal_session_exit', { exitCode: wandboxRes.exitCode, durationMs: wandboxRes.durationMs });
    return;
  }

  const pyBin = nativePy.command;
  socket.emit('terminal_session_output', {
    data: `$ python3 -u ${targetFile}\r\n`
  });

  let pyProc;
  try {
    pyProc = spawn(pyBin, ['-u', targetFile], {
      cwd: roomRunnerDir,
      env: {
        ...process.env,
        PATH: process.env.PATH,
        PYTHONUNBUFFERED: '1',
        PYTHONIOENCODING: 'utf-8'
      }
    });
  } catch (err) {
    socket.emit('terminal_session_output', {
      data: `Failed to launch Python: ${err.message}\r\n`,
      isError: true
    });
    socket.emit('terminal_session_exit', { exitCode: 1, durationMs: Date.now() - startTime });
    return;
  }

  // Register live session
  activeSessions.set(socket.id, {
    proc: pyProc,
    roomRunnerDir,
    roomId,
    initialFilesMap,
    startTime: Date.now(),
    command: `$ python3 -u ${targetFile}`
  });

  // Stream stdout directly to browser
  pyProc.stdout.on('data', (chunk) => {
    socket.emit('terminal_session_output', { data: chunk.toString() });
  });

  // Stream stderr directly to browser
  pyProc.stderr.on('data', (chunk) => {
    socket.emit('terminal_session_output', { data: chunk.toString(), isError: true });
  });

  const pyTimer = setTimeout(() => {
    if (!pyProc.killed) {
      try { pyProc.kill('SIGKILL'); } catch (e) {}
      socket.emit('terminal_session_output', {
        data: `\r\n[Execution Terminated: Timeout of 60 seconds exceeded]\r\n`,
        isError: true
      });
    }
  }, 60000);

  pyProc.on('close', async (code) => {
    clearTimeout(pyTimer);
    const durationMs = Date.now() - startTime;
    activeSessions.delete(socket.id);

    // Sync created, modified, and deleted files to workspace
    const changedFiles = await syncWorkspaceFilesAfterExecution({
      roomId,
      roomRunnerDir,
      initialFilesMap,
      io
    });

    const statusText = code === 0
      ? `\r\n\x1b[32m✓ Process finished with exit code 0\x1b[0m (${durationMs}ms)\r\n`
      : `\r\n\x1b[31m✗ Process exited with code ${code ?? 1}\x1b[0m (${durationMs}ms)\r\n`;

    socket.emit('terminal_session_output', { data: statusText });
    socket.emit('terminal_session_exit', {
      exitCode: code ?? 0,
      durationMs,
      changedFiles
    });
  });

  pyProc.on('error', (err) => {
    clearTimeout(pyTimer);
    activeSessions.delete(socket.id);
    socket.emit('terminal_session_output', {
      data: `\r\nPython error: ${err.message}\r\n`,
      isError: true
    });
    socket.emit('terminal_session_exit', { exitCode: 1, durationMs: Date.now() - startTime });
  });
}

/**
 * Sends real-time stdin input from the browser into the running program
 */
export function sendInputToInteractiveSession(socketId, input) {
  const session = activeSessions.get(socketId);
  if (session && session.proc && session.proc.stdin && !session.proc.killed) {
    try {
      session.proc.stdin.write(input);
      return true;
    } catch (e) {
      console.warn('[Stdin Write Warning]', e.message);
    }
  }
  return false;
}

/**
 * Stops an active interactive session
 */
export function stopInteractiveSession(socketId) {
  const session = activeSessions.get(socketId);
  if (session && session.proc && !session.proc.killed) {
    try {
      session.proc.kill('SIGINT');
      setTimeout(() => {
        if (!session.proc.killed) {
          try { session.proc.kill('SIGKILL'); } catch (e) {}
        }
      }, 500);
      activeSessions.delete(socketId);
      return true;
    } catch (e) {
      activeSessions.delete(socketId);
    }
  }
  return false;
}

export default {
  startInteractiveSession,
  sendInputToInteractiveSession,
  stopInteractiveSession
};
