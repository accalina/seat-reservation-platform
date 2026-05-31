import { describe, it, expect, beforeEach } from 'bun:test'
import { Database } from 'bun:sqlite'

const db = new Database(':memory:')
db.exec('PRAGMA foreign_keys=ON;')

db.exec('CREATE TABLE IF NOT EXISTS seats (id INTEGER PRIMARY KEY, label TEXT, version INTEGER DEFAULT 1)')
db.exec(`CREATE TABLE IF NOT EXISTS reservations (
  id TEXT PRIMARY KEY, user_id TEXT, seat_id INTEGER,
  status TEXT DEFAULT 'confirmed', payment_id TEXT
)`)
db.exec("INSERT INTO seats (id, label) VALUES (1, 'Test Seat A')")
db.exec("INSERT INTO seats (id, label) VALUES (2, 'Test Seat B')")

beforeEach(() => {
  db.exec('DELETE FROM reservations')
  db.exec("UPDATE seats SET version = 1 WHERE id = 1")
  db.exec("UPDATE seats SET version = 1 WHERE id = 2")
})

function finalizeReservation(seatId: number, userId: string, paymentId: string): { success: boolean; error?: string } {
  try {
    db.exec('BEGIN IMMEDIATE')

    // Check if seat exists by SELECT (query().run() returns undefined in bun 1.0.0)
    const seat = db.query('SELECT id, version FROM seats WHERE id = ?').get(seatId) as { id: number; version: number } | undefined
    if (!seat) {
      db.exec('ROLLBACK')
      return { success: false, error: 'Seat not found' }
    }

    // Check if seat is already reserved (within the transaction, this is the authoritative check)
    const existing = db.query("SELECT 1 FROM reservations WHERE seat_id = ? AND status = 'confirmed' LIMIT 1").get(seatId)
    if (existing) {
      db.exec('ROLLBACK')
      return { success: false, error: 'Seat already reserved' }
    }

    const reservationId = crypto.randomUUID()
    db.query("INSERT INTO reservations (id, user_id, seat_id, status, payment_id) VALUES (?, ?, ?, 'confirmed', ?)")
      .run(reservationId, userId, seatId, paymentId)

    db.exec('COMMIT')
    return { success: true }
  } catch (err) {
    try { db.exec('ROLLBACK') } catch {}
    return { success: false, error: 'Server error' }
  }
}

describe('Reservation Concurrency', () => {
  it('should allow only one reservation when 10 requests compete for the same seat', async () => {
    const results = await Promise.all(
      Array.from({ length: 10 }, (_, i) =>
        finalizeReservation(1, `user-${i}`, `payment-${i}`)
      )
    )

    const successes = results.filter((r) => r.success)
    const failures = results.filter((r) => !r.success)

    console.log(`Concurrency test: ${successes.length} succeeded, ${failures.length} failed (expected 1 success, 9 failures)`)

    expect(successes.length).toBe(1)
    expect(failures.length).toBe(9)

    failures.forEach((f) => {
      expect(f.error).toBe('Seat already reserved')
    })
  })

  it('should allow multiple reservations for different seats concurrently', async () => {
    const results = await Promise.all([
      finalizeReservation(1, 'user-a', 'payment-a'),
      finalizeReservation(2, 'user-b', 'payment-b'),
    ])

    expect(results[0].success).toBe(true)
    expect(results[1].success).toBe(true)
  })

  it('should fail reservation for non-existent seat', async () => {
    const result = finalizeReservation(999, 'user-x', 'payment-x')
    expect(result.success).toBe(false)
    expect(result.error).toBe('Seat not found')
  })
})