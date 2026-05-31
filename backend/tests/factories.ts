import { Database } from 'bun:sqlite'

export async function createTestUser(db: Database, overrides: Partial<{ email: string; password: string }> = {}) {
  const id = crypto.randomUUID()
  const email = overrides.email || `test-${id.slice(0, 8)}@example.com`
  const password = overrides.password || 'Password123!'
  const hash = await Bun.password.hash(password)

  db.query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)').run(id, email, hash)

  return { id, email, password }
}

export function createTestSeat(db: Database, label: string = 'Test Seat') {
  const result = db.query('INSERT INTO seats (label) VALUES (?) RETURNING id').get(label) as { id: number } | undefined
  return result?.id
}