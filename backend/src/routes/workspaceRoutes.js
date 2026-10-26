import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import JSZip from 'jszip';
import db from '../database/db.js';
import { requireSession, requireRoomMember } from '../middleware/auth.js';
import { uploadMiddleware } from '../middleware/upload.js';

const router = express.Router({ mergeParams: true });

function sanitizePath(filePath) {
  if (!filePath) return '';
  return filePath
    .replace(/\\/g, '/')
    .replace(/\/\.\.\//g, '/')
    .replace(/^\.\.\//, '')
    .replace(/^\/+/, '')
    .trim();
}

async function checkEditPermission(roomId, sessionId, filePath = null) {
  const { rows } = await db.query(
    `SELECT owner_session_id, editing_locked, locked_files FROM rooms WHERE id = $1`,
    [roomId]
  );
  if (rows.length === 0) return { allowed: false, message: 'Room not found.' };
  const room = rows[0];
  const isOwner = sessionId && sessionId === room.owner_session_id;
  if (isOwner) return { allowed: true };

  let lockedFiles = [];
  try {
    lockedFiles = JSON.parse(room.locked_files || '[]');
  } catch (e) {
    lockedFiles = [];
  }

  const isAllLocked = Boolean(room.editing_locked) || lockedFiles.includes('*');
  const isFileLocked = filePath && lockedFiles.includes(filePath);

  if (isAllLocked || isFileLocked) {
    return {
      allowed: false,
      message: isFileLocked
        ? `Code editing for '${filePath}' has been locked by the room owner. Read-only mode.`
        : 'Code editing has been locked by the room owner. Non-owners are in read-only mode.'
    };
  }
  return { allowed: true };
}

/**
 * Get workspace metadata and all project files
 * GET /api/rooms/:roomId/workspace
 */
router.get('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;

    // Get workspace
    let wsRes = await db.query(
      `SELECT id, room_id, name, project_type, created_at, updated_at 
       FROM workspaces 
       WHERE room_id = $1`,
      [roomId]
    );

    if (wsRes.rows.length === 0) {
      // Auto-create default workspace if missing
      const newWsId = `ws_${uuidv4().slice(0, 12)}`;
      await db.query(
        `INSERT INTO workspaces (id, room_id, name, project_type) 
         VALUES ($1, $2, 'main-project', 'web')`,
        [newWsId, roomId]
      );
      wsRes = await db.query(`SELECT * FROM workspaces WHERE id = $1`, [newWsId]);
    }

    const workspace = wsRes.rows[0];

    // Fetch all files
    const { rows: files } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files 
       WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspace.id]
    );

    res.json({
      workspace,
      files
    });
  } catch (err) {
    console.error('[Get Workspace Error]', err);
    res.status(500).json({ error: 'Failed to load project workspace.' });
  }
});

/**
 * Create or save a file/directory
 * POST /api/rooms/:roomId/workspace/files
 */
router.post('/files', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    let { path, content = '', isDirectory = false } = req.body;

    const cleanPath = sanitizePath(path);
    if (!cleanPath) {
      return res.status(400).json({ error: 'Valid file path is required.' });
    }

    const perm = await checkEditPermission(roomId, req.session?.id, cleanPath);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }
    if (!cleanPath) {
      return res.status(400).json({ error: 'Valid file path is required.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const workspaceId = wsRes.rows[0].id;

    const fileId = `file_${uuidv4().slice(0, 12)}`;
    const isDirInt = isDirectory ? 1 : 0;

    await db.query(
      `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
       VALUES ($1, $2, $3, $4, $5, datetime('now'))
       ON CONFLICT (workspace_id, path) 
       DO UPDATE SET content = $4, is_directory = $5, updated_at = datetime('now')`,
      [fileId, workspaceId, cleanPath, content, isDirInt]
    );

    await db.query(`UPDATE workspaces SET updated_at = datetime('now') WHERE id = $1`, [workspaceId]);

    res.json({
      success: true,
      file: {
        id: fileId,
        path: cleanPath,
        content,
        is_directory: isDirectory,
        updated_at: new Date().toISOString()
      }
    });
  } catch (err) {
    console.error('[Save File Error]', err);
    res.status(500).json({ error: 'Failed to save workspace file: ' + err.message });
  }
});

/**
 * Rename a file or directory
 * PATCH /api/rooms/:roomId/workspace/files/rename
 */
router.patch('/files/rename', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;

    const perm = await checkEditPermission(roomId, req.session?.id);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }

    const { oldPath, newPath } = req.body;

    const cleanOld = sanitizePath(oldPath);
    const cleanNew = sanitizePath(newPath);

    if (!cleanOld || !cleanNew) {
      return res.status(400).json({ error: 'Both old and new paths are required.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });
    const workspaceId = wsRes.rows[0].id;

    // Check if target already exists
    const existsRes = await db.query(
      `SELECT id FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
      [workspaceId, cleanNew]
    );
    if (existsRes.rows.length > 0) {
      return res.status(409).json({ error: `File or folder '${cleanNew}' already exists.` });
    }

    // 1. Rename exact match
    await db.query(
      `UPDATE workspace_files SET path = $1, updated_at = datetime('now')
       WHERE workspace_id = $2 AND path = $3`,
      [cleanNew, workspaceId, cleanOld]
    );

    // 2. If it's a directory, rename all child paths prefixed with oldPath + '/'
    const { rows: children } = await db.query(
      `SELECT id, path FROM workspace_files 
       WHERE workspace_id = $1 AND path LIKE $2`,
      [workspaceId, `${cleanOld}/%`]
    );

    for (const child of children) {
      const updatedChildPath = child.path.replace(`${cleanOld}/`, `${cleanNew}/`);
      await db.query(
        `UPDATE workspace_files SET path = $1, updated_at = datetime('now') WHERE id = $2`,
        [updatedChildPath, child.id]
      );
    }

    res.json({ success: true, oldPath: cleanOld, newPath: cleanNew });
  } catch (err) {
    console.error('[Rename Error]', err);
    res.status(500).json({ error: 'Failed to rename item.' });
  }
});

/**
 * Delete a file or directory
 * DELETE /api/rooms/:roomId/workspace/files
 */
router.delete('/files', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;

    const perm = await checkEditPermission(roomId, req.session?.id);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }

    const { path } = req.query;

    const cleanPath = sanitizePath(path);
    if (!cleanPath) {
      return res.status(400).json({ error: 'Valid path is required to delete.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });
    const workspaceId = wsRes.rows[0].id;

    // Delete exact match and any children
    await db.query(
      `DELETE FROM workspace_files 
       WHERE workspace_id = $1 AND (path = $2 OR path LIKE $3)`,
      [workspaceId, cleanPath, `${cleanPath}/%`]
    );

    res.json({ success: true, path: cleanPath });
  } catch (err) {
    console.error('[Delete File Error]', err);
    res.status(500).json({ error: 'Failed to delete file or folder.' });
  }
});

/**
 * Export workspace project as a ZIP archive
 * GET /api/rooms/:roomId/workspace/export-zip
 */
router.get('/export-zip', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const wsRes = await db.query(`SELECT id, name FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });

    const workspace = wsRes.rows[0];
    const { rows: files } = await db.query(
      `SELECT path, content, is_directory FROM workspace_files WHERE workspace_id = $1`,
      [workspace.id]
    );

    const zip = new JSZip();

    for (const f of files) {
      if (!f.is_directory) {
        zip.file(f.path, f.content);
      }
    }

    const zipBuffer = await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });

    const zipName = `${(workspace.name || 'project').replace(/\s+/g, '_')}.zip`;
    res.setHeader('Content-Disposition', `attachment; filename="${zipName}"`);
    res.setHeader('Content-Type', 'application/zip');
    res.send(zipBuffer);
  } catch (err) {
    console.error('[Export ZIP Error]', err);
    res.status(500).json({ error: 'Failed to generate project ZIP archive.' });
  }
});

/**
 * Import a ZIP archive and populate workspace files
 * POST /api/rooms/:roomId/workspace/import-zip
 */
router.post('/import-zip', requireSession, requireRoomMember, uploadMiddleware.single('zipFile'), async (req, res) => {
  try {
    const { roomId } = req.params;
    if (!req.file) {
      return res.status(400).json({ error: 'No ZIP file provided.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });
    const workspaceId = wsRes.rows[0].id;

    const { readFileSync, unlinkSync } = await import('node:fs');
    const zipData = readFileSync(req.file.path);
    const zip = await JSZip.loadAsync(zipData);

    const importedFiles = [];

    for (const [relativePath, zipEntry] of Object.entries(zip.files)) {
      if (zipEntry.dir) continue;
      // Skip hidden/system files
      if (relativePath.includes('__MACOSX') || relativePath.startsWith('.')) continue;

      const cleanPath = sanitizePath(relativePath);
      const content = await zipEntry.async('string');
      const fileId = `file_${uuidv4().slice(0, 12)}`;

      await db.query(
        `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
         VALUES ($1, $2, $3, $4, 0, datetime('now'))
         ON CONFLICT (workspace_id, path) 
         DO UPDATE SET content = $4, updated_at = datetime('now')`,
        [fileId, workspaceId, cleanPath, content]
      );

      importedFiles.push(cleanPath);
    }

    // Clean up uploaded temporary zip
    try { unlinkSync(req.file.path); } catch (e) {}

    res.json({
      success: true,
      importedCount: importedFiles.length,
      files: importedFiles
    });
  } catch (err) {
    console.error('[Import ZIP Error]', err);
    res.status(500).json({ error: 'Failed to unpack ZIP archive: ' + err.message });
  }
});

/**
 * Batch Move / Cut & Paste files and folders into a target folder
 * POST /api/rooms/:roomId/workspace/files/batch-move
 */
router.post('/files/batch-move', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const perm = await checkEditPermission(roomId, req.session?.id);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }

    const { paths = [], targetFolder = '' } = req.body;
    const cleanTarget = sanitizePath(targetFolder);

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'Array of file paths to move is required.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });
    const workspaceId = wsRes.rows[0].id;

    // Ensure target folder exists if specified
    if (cleanTarget) {
      const folderRes = await db.query(
        `SELECT id FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
        [workspaceId, cleanTarget]
      );
      if (folderRes.rows.length === 0) {
        const folderId = `file_${uuidv4().slice(0, 12)}`;
        await db.query(
          `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
           VALUES ($1, $2, $3, '', 1, datetime('now'))`,
          [folderId, workspaceId, cleanTarget]
        );
      }
    }

    const executedMoves = [];

    for (const rawPath of paths) {
      const cleanOld = sanitizePath(rawPath);
      if (!cleanOld) continue;

      // Cannot move a folder into itself or its own subfolder
      if (cleanTarget && (cleanTarget === cleanOld || cleanTarget.startsWith(`${cleanOld}/`))) {
        continue;
      }

      const baseName = cleanOld.split('/').pop();
      const cleanNew = cleanTarget ? `${cleanTarget}/${baseName}` : baseName;

      if (cleanNew === cleanOld) continue;

      // Delete existing file at target if any
      await db.query(
        `DELETE FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
        [workspaceId, cleanNew]
      );

      // 1. Move exact item
      await db.query(
        `UPDATE workspace_files SET path = $1, updated_at = datetime('now')
         WHERE workspace_id = $2 AND path = $3`,
        [cleanNew, workspaceId, cleanOld]
      );

      // 2. If it's a directory, move all its nested children
      const { rows: children } = await db.query(
        `SELECT id, path FROM workspace_files 
         WHERE workspace_id = $1 AND path LIKE $2`,
        [workspaceId, `${cleanOld}/%`]
      );

      for (const child of children) {
        const updatedChildPath = child.path.replace(`${cleanOld}/`, `${cleanNew}/`);
        await db.query(
          `UPDATE workspace_files SET path = $1, updated_at = datetime('now') WHERE id = $2`,
          [updatedChildPath, child.id]
        );
      }

      executedMoves.push({ oldPath: cleanOld, newPath: cleanNew });
    }

    await db.query(`UPDATE workspaces SET updated_at = datetime('now') WHERE id = $1`, [workspaceId]);

    const { rows: allFiles } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspaceId]
    );

    res.json({
      success: true,
      moves: executedMoves,
      files: allFiles
    });
  } catch (err) {
    console.error('[Batch Move Error]', err);
    res.status(500).json({ error: 'Failed to move files: ' + err.message });
  }
});

/**
 * Batch Copy files and folders into a target folder
 * POST /api/rooms/:roomId/workspace/files/batch-copy
 */
router.post('/files/batch-copy', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const perm = await checkEditPermission(roomId, req.session?.id);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }

    const { paths = [], targetFolder = '' } = req.body;
    const cleanTarget = sanitizePath(targetFolder);

    if (!Array.isArray(paths) || paths.length === 0) {
      return res.status(400).json({ error: 'Array of file paths to copy is required.' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) return res.status(404).json({ error: 'Workspace not found.' });
    const workspaceId = wsRes.rows[0].id;

    // Ensure target folder exists if specified
    if (cleanTarget) {
      const folderRes = await db.query(
        `SELECT id FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
        [workspaceId, cleanTarget]
      );
      if (folderRes.rows.length === 0) {
        const folderId = `file_${uuidv4().slice(0, 12)}`;
        await db.query(
          `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
           VALUES ($1, $2, $3, '', 1, datetime('now'))`,
          [folderId, workspaceId, cleanTarget]
        );
      }
    }

    const copiedFiles = [];

    for (const rawPath of paths) {
      const cleanSource = sanitizePath(rawPath);
      if (!cleanSource) continue;

      const { rows: origRows } = await db.query(
        `SELECT path, content, is_directory FROM workspace_files 
         WHERE workspace_id = $1 AND path = $2`,
        [workspaceId, cleanSource]
      );
      if (origRows.length === 0) continue;
      const original = origRows[0];

      const baseName = cleanSource.split('/').pop();
      let targetPath = cleanTarget ? `${cleanTarget}/${baseName}` : baseName;

      // If target is same as source, append _copy
      if (targetPath === cleanSource) {
        if (original.is_directory) {
          targetPath = `${cleanSource}_copy`;
        } else {
          const dotIdx = baseName.lastIndexOf('.');
          if (dotIdx > 0) {
            const name = baseName.slice(0, dotIdx);
            const ext = baseName.slice(dotIdx);
            targetPath = cleanTarget ? `${cleanTarget}/${name}_copy${ext}` : `${name}_copy${ext}`;
          } else {
            targetPath = `${cleanSource}_copy`;
          }
        }
      }

      // Ensure unique name if duplicate exists
      let finalPath = targetPath;
      let counter = 1;
      while (true) {
        const { rows: exists } = await db.query(
          `SELECT id FROM workspace_files WHERE workspace_id = $1 AND path = $2`,
          [workspaceId, finalPath]
        );
        if (exists.length === 0) break;
        counter++;
        const dot = targetPath.lastIndexOf('.');
        if (dot > 0 && !original.is_directory) {
          finalPath = `${targetPath.slice(0, dot)}_${counter}${targetPath.slice(dot)}`;
        } else {
          finalPath = `${targetPath}_${counter}`;
        }
      }

      // Copy primary item
      const newFileId = `file_${uuidv4().slice(0, 12)}`;
      await db.query(
        `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
         VALUES ($1, $2, $3, $4, $5, datetime('now'))`,
        [newFileId, workspaceId, finalPath, original.content, original.is_directory]
      );

      copiedFiles.push({ path: finalPath, is_directory: original.is_directory });

      // If directory, copy all children
      if (original.is_directory) {
        const { rows: children } = await db.query(
          `SELECT path, content, is_directory FROM workspace_files 
           WHERE workspace_id = $1 AND path LIKE $2`,
          [workspaceId, `${cleanSource}/%`]
        );

        for (const child of children) {
          const childSub = child.path.slice(cleanSource.length + 1);
          const newChildPath = `${finalPath}/${childSub}`;
          const childFileId = `file_${uuidv4().slice(0, 12)}`;
          await db.query(
            `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
             VALUES ($1, $2, $3, $4, $5, datetime('now'))
             ON CONFLICT (workspace_id, path) DO UPDATE SET content = $4, is_directory = $5, updated_at = datetime('now')`,
            [childFileId, workspaceId, newChildPath, child.content, child.is_directory]
          );
          copiedFiles.push({ path: newChildPath, is_directory: child.is_directory });
        }
      }
    }

    await db.query(`UPDATE workspaces SET updated_at = datetime('now') WHERE id = $1`, [workspaceId]);

    const { rows: allFiles } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspaceId]
    );

    res.json({
      success: true,
      copied: copiedFiles,
      files: allFiles
    });
  } catch (err) {
    console.error('[Batch Copy Error]', err);
    res.status(500).json({ error: 'Failed to copy files: ' + err.message });
  }
});

/**
 * Batch upload files/images (e.g. from drag-and-drop or multi-file selection)
 * POST /api/rooms/:roomId/workspace/files/batch-upload
 * Payload: { files: [{ path, content, isDirectory }] }
 */
router.post('/files/batch-upload', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { files: uploadedItems = [] } = req.body;

    if (!Array.isArray(uploadedItems) || uploadedItems.length === 0) {
      return res.status(400).json({ error: 'No files provided for upload.' });
    }

    const perm = await checkEditPermission(roomId, req.session?.id);
    if (!perm.allowed) {
      return res.status(403).json({ error: perm.message, code: 'EDITING_LOCKED' });
    }

    const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
    if (wsRes.rows.length === 0) {
      return res.status(404).json({ error: 'Workspace not found.' });
    }
    const workspaceId = wsRes.rows[0].id;

    const insertedFiles = [];

    // Process each uploaded file/directory
    for (const item of uploadedItems) {
      const cleanPath = sanitizePath(item.path);
      if (!cleanPath) continue;

      const isDir = Boolean(item.isDirectory || item.is_directory);
      const isDirInt = isDir ? 1 : 0;
      const content = item.content || '';

      // Auto-ensure parent directory nodes exist
      const parts = cleanPath.split('/');
      for (let i = 1; i < parts.length; i++) {
        const parentDir = parts.slice(0, i).join('/');
        const dirId = `dir_${uuidv4().slice(0, 10)}`;
        await db.query(
          `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
           VALUES ($1, $2, $3, '', 1, datetime('now'))
           ON CONFLICT (workspace_id, path) DO NOTHING`,
          [dirId, workspaceId, parentDir]
        );
      }

      const fileId = `file_${uuidv4().slice(0, 12)}`;
      await db.query(
        `INSERT INTO workspace_files (id, workspace_id, path, content, is_directory, updated_at)
         VALUES ($1, $2, $3, $4, $5, datetime('now'))
         ON CONFLICT (workspace_id, path) 
         DO UPDATE SET content = $4, is_directory = $5, updated_at = datetime('now')`,
        [fileId, workspaceId, cleanPath, content, isDirInt]
      );

      insertedFiles.push({ path: cleanPath, is_directory: isDir });
    }

    await db.query(`UPDATE workspaces SET updated_at = datetime('now') WHERE id = $1`, [workspaceId]);

    const { rows: allFiles } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspaceId]
    );

    res.json({
      success: true,
      uploadedCount: insertedFiles.length,
      uploaded: insertedFiles,
      files: allFiles
    });
  } catch (err) {
    console.error('[Batch Upload Error]', err);
    res.status(500).json({ error: 'Failed to upload files: ' + err.message });
  }
});

export default router;
