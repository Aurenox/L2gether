import express from 'express';
import db from '../database/db.js';
import { requireSession, requireRoomMember } from '../middleware/auth.js';
import {
  PACKAGE_CATALOG,
  GOOGLE_FONTS_CATALOG,
  getInstalledDependencies,
  installPackage,
  uninstallPackage,
  importGoogleFonts
} from '../services/packageService.js';

const router = express.Router({ mergeParams: true });

async function getWorkspaceId(roomId) {
  const wsRes = await db.query(`SELECT id FROM workspaces WHERE room_id = $1`, [roomId]);
  return wsRes.rows.length > 0 ? wsRes.rows[0].id : null;
}

/**
 * Get catalog of searchable packages and Google Fonts
 * GET /api/rooms/:roomId/packages/catalog
 */
router.get('/catalog', requireSession, requireRoomMember, (req, res) => {
  res.json({
    catalog: PACKAGE_CATALOG,
    googleFonts: GOOGLE_FONTS_CATALOG
  });
});

/**
 * List installed dependencies for room's workspace
 * GET /api/rooms/:roomId/packages
 */
router.get('/', requireSession, requireRoomMember, async (req, res) => {
  try {
    const workspaceId = await getWorkspaceId(req.params.roomId);
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const dependencies = await getInstalledDependencies(workspaceId);
    res.json({ dependencies });
  } catch (err) {
    res.status(500).json({ error: 'Failed to list dependencies: ' + err.message });
  }
});

/**
 * Install a package into workspace
 * POST /api/rooms/:roomId/packages/install
 */
router.post('/install', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { packageName, version, environment, targetFile } = req.body;
    if (!packageName) return res.status(400).json({ error: 'Package name is required.' });

    const workspaceId = await getWorkspaceId(roomId);
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const result = await installPackage(workspaceId, {
      packageName,
      version,
      environment: environment || 'npm',
      targetFile: targetFile || 'index.html'
    });

    const { rows: files } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspaceId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('workspace_files_updated', { roomId, files });
    }

    res.json({
      ...result,
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to install package: ' + err.message });
  }
});

/**
 * Uninstall a package
 * POST /api/rooms/:roomId/packages/uninstall
 */
router.post('/uninstall', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { roomId } = req.params;
    const { packageName, environment, targetFile } = req.body;
    if (!packageName) return res.status(400).json({ error: 'Package name is required.' });

    const workspaceId = await getWorkspaceId(roomId);
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const result = await uninstallPackage(workspaceId, {
      packageName,
      environment: environment || 'npm',
      targetFile: targetFile || 'index.html'
    });

    const { rows: files } = await db.query(
      `SELECT id, path, content, is_directory, updated_at 
       FROM workspace_files WHERE workspace_id = $1 
       ORDER BY is_directory DESC, path ASC`,
      [workspaceId]
    );

    const io = req.app.get('io');
    if (io) {
      io.to(roomId).emit('workspace_files_updated', { roomId, files });
    }

    res.json({
      ...result,
      files
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to uninstall package: ' + err.message });
  }
});

/**
 * Import Google Fonts into index.html and styles.css
 * POST /api/rooms/:roomId/packages/fonts
 */
router.post('/fonts', requireSession, requireRoomMember, async (req, res) => {
  try {
    const { fontFamilies, targetFile } = req.body;
    if (!fontFamilies || !Array.isArray(fontFamilies) || fontFamilies.length === 0) {
      return res.status(400).json({ error: 'fontFamilies array is required.' });
    }

    const workspaceId = await getWorkspaceId(req.params.roomId);
    if (!workspaceId) return res.status(404).json({ error: 'Workspace not found.' });

    const result = await importGoogleFonts(workspaceId, fontFamilies, targetFile || 'index.html');
    res.json(result);
  } catch (err) {
    res.status(500).json({ error: 'Failed to import fonts: ' + err.message });
  }
});

export default router;
