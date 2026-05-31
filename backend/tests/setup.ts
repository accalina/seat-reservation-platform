import { Database } from 'bun:sqlite'
import { beforeAll, afterAll } from 'bun:test'

const testDb = new Database(':memory:')
testDb.exec('PRAGMA journal_mode=WAL;')
testDb.exec('PRAGMA foreign_keys=ON;')

testDb.exec(`CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`)
testDb.exec(`CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`)
testDb.exec(`CREATE TABLE seats (
  id INTEGER PRIMARY KEY,
  label TEXT NOT NULL,
  version INTEGER NOT NULL DEFAULT 1
)`)
testDb.exec(`CREATE TABLE reservations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  seat_id INTEGER NOT NULL REFERENCES seats(id),
  status TEXT NOT NULL DEFAULT 'confirmed',
  payment_id TEXT,
  created_at INTEGER NOT NULL DEFAULT (unixepoch())
)`)

export { testDb }