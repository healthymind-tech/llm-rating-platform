import fs from 'fs';
import path from 'path';
import pool from '../config/database';

// Simple migration runner: executes .sql files in src/database/migrations once
export async function runMigrations(): Promise<void> {
  const migrationsDir = path.resolve(process.cwd(), 'src', 'database', 'migrations');

  // If directory doesn’t exist (dev/packaging edge), skip gracefully
  if (!fs.existsSync(migrationsDir)) {
    console.warn(`Migrations directory not found at ${migrationsDir}. Skipping migrations.`);
    return;
  }

  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        id SERIAL PRIMARY KEY,
        name TEXT UNIQUE NOT NULL,
        run_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
      );
    `);

    const appliedRes = await client.query<{ name: string }>('SELECT name FROM schema_migrations');
    const applied = new Set(appliedRes.rows.map(r => r.name));

    const files = fs
      .readdirSync(migrationsDir)
      .filter(f => f.endsWith('.sql'))
      .sort((a, b) => a.localeCompare(b));

    for (const file of files) {
      if (applied.has(file)) {
        continue;
      }

      const fullPath = path.join(migrationsDir, file);
      const sql = fs.readFileSync(fullPath, 'utf8');

      console.log(`\nRunning migration: ${file}`);
      try {
        await client.query('BEGIN');
        await client.query(sql);
        await client.query('INSERT INTO schema_migrations(name) VALUES($1)', [file]);
        await client.query('COMMIT');
        console.log(`✅ Migration applied: ${file}`);
      } catch (err) {
        await client.query('ROLLBACK');
        console.error(`❌ Migration failed: ${file}`, err);
        throw err;
      }
    }

    if (files.filter(f => !applied.has(f)).length === 0) {
      console.log('No new migrations to apply.');
    }
  } finally {
    client.release();
  }
}

