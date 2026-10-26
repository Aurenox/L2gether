import express from 'express';
import db from '../database/db.js';
import { requireSession, requireRoomMember } from '../middleware/auth.js';
import { executeCode, executeTerminalCommand, checkSystemCompilers, executeTestCases } from '../services/executionService.js';

const router = express.Router({ mergeParams: true });

/**
 * Execute code in isolated runner environment
 * POST /api/rooms/:roomId/execute
 */
router.post('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { language, code, stdin, files } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({
        success: false,
        stdout: '',
        stderr: 'Cannot execute empty code.',
        exitCode: 1,
        durationMs: 0,
        problems: []
      });
    }

    // Ensure all workspace files are available for read/execute
    let workspaceFiles = Array.isArray(files) && files.length > 0 ? files : [];
    if (workspaceFiles.length === 0 && roomId) {
      try {
        const filesRes = await db.query(
          `SELECT wf.path, wf.content FROM workspace_files wf
           JOIN workspaces w ON wf.workspace_id = w.id
           WHERE w.room_id = $1`,
          [roomId]
        );
        workspaceFiles = filesRes.rows || [];
      } catch (e) {
        console.warn('[Execution DB Files Warning]', e.message);
      }
    }

    const result = await executeCode({
      language: language || 'javascript',
      code,
      stdin: stdin || '',
      files: workspaceFiles
    });

    res.json(result);
  } catch (err) {
    console.error('[Execution Error]', err);
    res.status(500).json({
      success: false,
      stdout: '',
      stderr: 'Internal execution error: ' + err.message,
      exitCode: 1,
      durationMs: 0,
      problems: []
    });
  }
});

/**
 * Execute interactive shell command in terminal (gcc, python, ls, etc.)
 * POST /api/rooms/:roomId/execute/terminal
 */
router.post('/terminal', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { command, stdin } = req.body;

    // Fetch workspace files for this room
    const filesRes = await db.query(
      `SELECT wf.path, wf.content FROM workspace_files wf
       JOIN workspaces w ON wf.workspace_id = w.id
       WHERE w.room_id = $1`,
      [roomId]
    );

    const result = await executeTerminalCommand({
      commandLine: command,
      roomId,
      workspaceFiles: filesRes.rows || [],
      stdin: stdin || ''
    });

    res.json(result);
  } catch (err) {
    console.error('[Terminal Exec Error]', err);
    res.status(500).json({
      command: req.body?.command || '',
      stdout: '',
      stderr: 'Terminal execution error: ' + err.message,
      exitCode: 1,
      durationMs: 0
    });
  }
});

/**
 * Check compiler and runtime availability (gcc, python, node)
 * GET /api/rooms/:roomId/execute/compilers
 */
router.get('/compilers', requireSession, requireRoomMember, async (req, res) => {
  try {
    const compilers = checkSystemCompilers();
    res.json(compilers);
  } catch (err) {
    res.status(500).json({ error: 'Failed to inspect compilers: ' + err.message });
  }
});

/**
 * Run automated test cases against code
 * POST /api/rooms/:roomId/execute/test-cases
 */
router.post('/test-cases', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { language, code, testCases, files } = req.body;

    if (!code || code.trim().length === 0) {
      return res.status(400).json({ error: 'Cannot execute empty code.' });
    }

    let workspaceFiles = Array.isArray(files) && files.length > 0 ? files : [];
    if (workspaceFiles.length === 0 && roomId) {
      try {
        const filesRes = await db.query(
          `SELECT wf.path, wf.content FROM workspace_files wf
           JOIN workspaces w ON wf.workspace_id = w.id
           WHERE w.room_id = $1`,
          [roomId]
        );
        workspaceFiles = filesRes.rows || [];
      } catch (e) {}
    }

    const result = await executeTestCases({
      language: language || 'c',
      code,
      testCases: Array.isArray(testCases) ? testCases : [],
      files: workspaceFiles
    });

    res.json(result);
  } catch (err) {
    console.error('[Test Cases Error]', err);
    res.status(500).json({ error: 'Test execution failed: ' + err.message });
  }
});

export default router;
