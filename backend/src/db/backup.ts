import { sqlite } from './connection'
import { existsSync, mkdirSync } from 'fs'
import { join } from 'path'

const backupDir = join(import.meta.dir, '..', '..', 'data', 'backups')
if (!existsSync(backupDir)) mkdirSync(backupDir, { recursive: true })

const timestamp = new Date().toISOString().replace(/[:.]/g, '-')
const backupPath = join(backupDir, `seat-reservation-${timestamp}.db`)

// SQLite backup via VACUUM INTO (creates a clean copy)
sqlite.exec(`VACUUM INTO '${backupPath}'`)
console.log(`✅ Backup created: ${backupPath}`)