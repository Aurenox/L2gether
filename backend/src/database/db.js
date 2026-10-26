import { existsSync, mkdirSync, readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';
import { DatabaseSync } from 'node:sqlite';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

let pgPool = null;
let sqliteDb = null;
let isPostgres = false;

// Ensure storage directory exists
const storageDir = join(__dirname, '../../storage');
if (!existsSync(storageDir)) {
  mkdirSync(storageDir, { recursive: true });
}

export async function initDatabase() {
  const databaseUrl = process.env.DATABASE_URL;

  if (databaseUrl && databaseUrl.trim() !== '') {
    try {
      console.log('[DB] Attempting connection to PostgreSQL...');
      pgPool = new pg.Pool({
        connectionString: databaseUrl,
        connectionTimeoutMillis: 5000
      });
      // Test connection
      const client = await pgPool.connect();
      console.log('[DB] Connected successfully to PostgreSQL database!');
      client.release();
      isPostgres = true;

      // Run PostgreSQL schema migrations
      const schemaSql = readFileSync(join(__dirname, 'schema.sql'), 'utf-8');
      await pgPool.query(schemaSql);
      console.log('[DB] PostgreSQL schema verified/migrated successfully.');
      return;
    } catch (err) {
      console.warn('[DB] PostgreSQL connection failed or unavailable:', err.message);
      console.log('[DB] Falling back to embedded high-performance SQLite engine for zero-friction local development.');
    }
  } else {
    console.log('[DB] No DATABASE_URL provided. Using embedded SQLite engine (zero configuration required).');
  }

  // Fallback to SQLite (built-in Node.js v24 DatabaseSync)
  const isTest = process.env.NODE_ENV === 'test';
  const dbFile = isTest ? 'l2gether_test.db' : 'l2gether.db';
  const dbPath = join(storageDir, dbFile);
  sqliteDb = new DatabaseSync(dbPath);
  sqliteDb.exec('PRAGMA foreign_keys = ON;');
  sqliteDb.exec('PRAGMA journal_mode = WAL;');
  sqliteDb.exec('PRAGMA busy_timeout = 10000;');

  // Translate PostgreSQL schema for SQLite compatibility
  const sqliteSchema = `
    CREATE TABLE IF NOT EXISTS guest_sessions (
      id TEXT PRIMARY KEY,
      session_token_hash TEXT NOT NULL,
      display_name TEXT NOT NULL,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      revoked_at TEXT
    );
    CREATE INDEX IF NOT EXISTS idx_guest_sessions_expires_at ON guest_sessions(expires_at);

    CREATE TABLE IF NOT EXISTS rooms (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      owner_session_id TEXT NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
      visibility TEXT NOT NULL DEFAULT 'public',
      passcode_hash TEXT,
      owner_password_hash TEXT,
      owner_recovery_key_hash TEXT,
      editing_locked INTEGER NOT NULL DEFAULT 0,
      locked_files TEXT NOT NULL DEFAULT '[]',
      max_participants INTEGER NOT NULL DEFAULT 25,
      created_at TEXT DEFAULT (datetime('now')),
      expires_at TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active'
    );
    CREATE INDEX IF NOT EXISTS idx_rooms_expires_at ON rooms(expires_at);
    CREATE INDEX IF NOT EXISTS idx_rooms_status ON rooms(status);

    CREATE TABLE IF NOT EXISTS room_memberships (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
      role TEXT NOT NULL DEFAULT 'participant',
      joined_at TEXT DEFAULT (datetime('now')),
      revoked_at TEXT,
      UNIQUE(room_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_memberships_room ON room_memberships(room_id);
    CREATE INDEX IF NOT EXISTS idx_memberships_session ON room_memberships(session_id);

    CREATE TABLE IF NOT EXISTS join_requests (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      session_id TEXT NOT NULL REFERENCES guest_sessions(id) ON DELETE CASCADE,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT DEFAULT (datetime('now')),
      reviewed_at TEXT,
      reviewed_by TEXT REFERENCES guest_sessions(id) ON DELETE SET NULL,
      UNIQUE(room_id, session_id)
    );
    CREATE INDEX IF NOT EXISTS idx_join_requests_room ON join_requests(room_id, status);

    CREATE TABLE IF NOT EXISTS messages (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      sender_session_id TEXT REFERENCES guest_sessions(id) ON DELETE SET NULL,
      sender_name TEXT NOT NULL,
      message_type TEXT NOT NULL DEFAULT 'text',
      content TEXT NOT NULL,
      metadata TEXT,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_messages_room_created ON messages(room_id, created_at);

    CREATE TABLE IF NOT EXISTS files (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      uploaded_by_session_id TEXT REFERENCES guest_sessions(id) ON DELETE SET NULL,
      uploaded_by_name TEXT NOT NULL,
      original_filename TEXT NOT NULL,
      storage_key TEXT NOT NULL,
      mime_type TEXT NOT NULL,
      size_bytes INTEGER NOT NULL,
      created_at TEXT DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_files_room ON files(room_id);

    CREATE TABLE IF NOT EXISTS workspaces (
      id TEXT PRIMARY KEY,
      room_id TEXT NOT NULL REFERENCES rooms(id) ON DELETE CASCADE,
      name TEXT NOT NULL DEFAULT 'main-project',
      project_type TEXT NOT NULL DEFAULT 'web',
      created_at TEXT DEFAULT (datetime('now')),
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(room_id)
    );
    CREATE INDEX IF NOT EXISTS idx_workspaces_room ON workspaces(room_id);

    CREATE TABLE IF NOT EXISTS workspace_files (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      path TEXT NOT NULL,
      content TEXT NOT NULL DEFAULT '',
      is_directory INTEGER NOT NULL DEFAULT 0,
      updated_at TEXT DEFAULT (datetime('now')),
      UNIQUE(workspace_id, path)
    );
    CREATE INDEX IF NOT EXISTS idx_workspace_files_ws ON workspace_files(workspace_id);

    CREATE TABLE IF NOT EXISTS dependencies (
      id TEXT PRIMARY KEY,
      workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
      package_name TEXT NOT NULL,
      version TEXT,
      environment TEXT NOT NULL DEFAULT 'npm',
      installed_at TEXT DEFAULT (datetime('now')),
      UNIQUE(workspace_id, package_name, environment)
    );
  `;

  sqliteDb.exec(sqliteSchema);

  // Auto-migrate columns if table already existed
  try {
    const cols = sqliteDb.prepare("PRAGMA table_info(rooms);").all();
    const colNames = cols.map(c => c.name);
    if (!colNames.includes('owner_password_hash')) {
      sqliteDb.exec("ALTER TABLE rooms ADD COLUMN owner_password_hash TEXT;");
    }
    if (!colNames.includes('owner_recovery_key_hash')) {
      sqliteDb.exec("ALTER TABLE rooms ADD COLUMN owner_recovery_key_hash TEXT;");
    }
    if (!colNames.includes('editing_locked')) {
      sqliteDb.exec("ALTER TABLE rooms ADD COLUMN editing_locked INTEGER NOT NULL DEFAULT 0;");
    }
    if (!colNames.includes('locked_files')) {
      sqliteDb.exec("ALTER TABLE rooms ADD COLUMN locked_files TEXT NOT NULL DEFAULT '[]';");
    }
    if (!colNames.includes('max_participants')) {
      sqliteDb.exec("ALTER TABLE rooms ADD COLUMN max_participants INTEGER NOT NULL DEFAULT 25;");
    }
  } catch (e) {
    console.warn('[DB Migration Warning]', e.message);
  }

  console.log('[DB] SQLite database initialized at:', dbPath);
}

/**
 * Executes a SQL query with parameters.
 * Supports both PostgreSQL ($1, $2) and SQLite (? or $1 mapped) transparently.
 */
export async function query(sql, params = []) {
  if (isPostgres && pgPool) {
    const res = await pgPool.query(sql, params);
    return { rows: res.rows, rowCount: res.rowCount };
  }

  if (!sqliteDb) {
    throw new Error('Database has not been initialized. Call initDatabase() first.');
  }

  // Convert $1, $2, etc. to SQLite ? parameter placeholders while preserving param order even if reused
  const sqliteParams = [];
  let sqliteSql = sql.replace(/\$(\d+)/g, (_, num) => {
    const idx = parseInt(num, 10) - 1;
    sqliteParams.push(params[idx]);
    return '?';
  });

  // Handle boolean literals (true/false) in SQLite if needed
  sqliteSql = sqliteSql.replace(/TRUE/gi, '1').replace(/FALSE/gi, '0');

  // Handle ILIKE -> LIKE
  sqliteSql = sqliteSql.replace(/\s+ILIKE\s+/gi, ' LIKE ');

  try {
    const stmt = sqliteDb.prepare(sqliteSql);
    const isSelect = /^\s*(SELECT|WITH|PRAGMA)/i.test(sqliteSql);

    if (isSelect) {
      const rows = stmt.all(...sqliteParams);
      return { rows, rowCount: rows.length };
    } else {
      const result = stmt.run(...sqliteParams);
      return {
        rows: [],
        rowCount: result.changes,
        lastInsertRowid: result.lastInsertRowid
      };
    }
  } catch (err) {
    console.error('[DB Query Error]', err.message, 'SQL:', sqliteSql, 'Params:', sqliteParams);
    throw err;
  }
}

export function isUsingPostgres() {
  return isPostgres;
}

export default { query, initDatabase, isUsingPostgres };
