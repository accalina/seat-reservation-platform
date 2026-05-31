import { mkdirSync } from 'fs'
import { dirname } from 'path'
import { Database } from 'bun:sqlite'
import { drizzle } from 'drizzle-orm/bun-sqlite'

const dbPath = 'data/seat-reservation.db'
mkdirSync(dirname(dbPath), { recursive: true })
const sqlite = new Database(dbPath, { create: true })

// Enable WAL mode for better concurrent read performance
sqlite.exec('PRAGMA journal_mode=WAL;')
// Enable foreign keys (SQLite disables them by default!)
sqlite.exec('PRAGMA foreign_keys=ON;')

export const db = drizzle(sqlite)
export { sqlite }