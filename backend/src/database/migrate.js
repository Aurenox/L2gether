import { initDatabase, isUsingPostgres } from './db.js';

async function runMigration() {
  console.log('[Migration] Starting L2gether database migration...');
  try {
    await initDatabase();
    console.log(`[Migration] Database migration completed successfully using ${isUsingPostgres() ? 'PostgreSQL' : 'SQLite'}.`);
    process.exit(0);
  } catch (err) {
    console.error('[Migration Error]', err);
    process.exit(1);
  }
}

runMigration();
