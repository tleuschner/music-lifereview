import { readFileSync, readdirSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';
import { createDatabase } from '../../../config/database.js';
import { loadConfig } from '../../../config/environment.js';

const __dirname = dirname(fileURLToPath(import.meta.url));
const config = loadConfig();
const db = createDatabase(config.databaseUrl);

async function runMigrations() {
  // Ensure tracking table exists
  await db.raw(`
    CREATE TABLE IF NOT EXISTS schema_migrations (
      filename TEXT PRIMARY KEY,
      applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);

  // Bootstrap: if schema_migrations is empty but upload_sessions already exists,
  // the DB was set up before tracking was introduced — mark all migrations up to
  // (but not including) 009 as applied so we skip them on this run.
  const trackedCount = await db('schema_migrations').count('filename as c').first() as { c: string };
  if (Number(trackedCount.c) === 0) {
    const tableExists = await db.raw(`
      SELECT 1 FROM information_schema.tables
      WHERE table_name = 'upload_sessions' AND table_schema = 'public'
    `);
    if (tableExists.rows.length > 0) {
      const migrationsDir = join(__dirname, 'migrations');
      const allFiles = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();
      // Mark every migration before 009 as already applied
      const alreadyApplied = allFiles.filter(f => f < '009_');
      if (alreadyApplied.length > 0) {
        await db('schema_migrations').insert(
          alreadyApplied.map(filename => ({ filename }))
        );
        console.log(`Bootstrapped ${alreadyApplied.length} pre-existing migration(s) into tracking table.`);
      }
    }
  }

  const applied = await db('schema_migrations').pluck('filename') as string[];
  const appliedSet = new Set(applied);

  const migrationsDir = join(__dirname, 'migrations');
  const files = readdirSync(migrationsDir).filter(f => f.endsWith('.sql')).sort();

  const pending = files.filter(f => !appliedSet.has(f));

  if (pending.length === 0) {
    console.log('No new migrations to run.');
    await db.destroy();
    return;
  }

  console.log(`Running ${pending.length} new migration(s)...`);

  for (const file of pending) {
    const sql = readFileSync(join(migrationsDir, file), 'utf-8');
    console.log(`  Running ${file}...`);
    await db.raw(sql);
    await db('schema_migrations').insert({ filename: file });
  }

  console.log('Migrations complete.');
  await db.destroy();
}

runMigrations().catch(err => {
  console.error('Migration failed:', err);
  process.exit(1);
});
