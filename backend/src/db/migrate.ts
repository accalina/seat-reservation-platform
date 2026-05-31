import { sqlite } from './connection'

console.log('Running database migrations...')

// Migration tracking table (to prevent re-running migrations)
sqlite.exec(`
  CREATE TABLE IF NOT EXISTS _migrations (
    name TEXT PRIMARY KEY,
    applied_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

const hasMigrationBeenApplied = (name: string): boolean => {
  const result = sqlite
    .query(`SELECT COUNT(*) as count FROM _migrations WHERE name = ?`)
    .get(name) as { count: number } | undefined
  return (result?.count ?? 0) > 0
}

const applyMigration = (name: string, sql: string) => {
  if (hasMigrationBeenApplied(name)) {
    console.log(`  ⏭️  Skipping ${name} (already applied)`)
    return
  }

  console.log(`  📦 Applying ${name}...`)
  sqlite.exec(sql)
  sqlite.run(`INSERT INTO _migrations (name) VALUES (?)`, [name])
  console.log(`  ✅ ${name} applied`)
}

// Migration 001: Create core tables
applyMigration('001_create_tables', `
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS sessions (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    expires_at INTEGER NOT NULL,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );

  CREATE TABLE IF NOT EXISTS seats (
    id INTEGER PRIMARY KEY,
    label TEXT NOT NULL,
    version INTEGER NOT NULL DEFAULT 1
  );

  CREATE TABLE IF NOT EXISTS reservations (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    seat_id INTEGER NOT NULL REFERENCES seats(id),
    status TEXT NOT NULL DEFAULT 'confirmed',
    payment_id TEXT,
    created_at INTEGER NOT NULL DEFAULT (unixepoch())
  );
`)

// Migration 002: Add indexes for performance
applyMigration('002_add_indexes', `
  CREATE INDEX IF NOT EXISTS idx_sessions_user_id ON sessions(user_id);
  CREATE INDEX IF NOT EXISTS idx_sessions_expires_at ON sessions(expires_at);
  CREATE INDEX IF NOT EXISTS idx_reservations_user_id ON reservations(user_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_seat_id ON reservations(seat_id);
  CREATE INDEX IF NOT EXISTS idx_reservations_status ON reservations(status);
  CREATE INDEX IF NOT EXISTS idx_reservations_seat_status ON reservations(seat_id, status);
  CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
`)

console.log('✅ Migration complete: all tables and indexes created')