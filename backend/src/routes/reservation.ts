import { Elysia, t } from 'elysia'
import { sqlite } from '../db/connection'
import { authMiddleware } from '../middleware/auth'
import { invalidateSeatsCache } from './seats'
import { logger } from '../utils/logger'

const HOLD_TTL_S = 300

function clearExpiredHolds() {
  sqlite.exec(
    `DELETE FROM reservations WHERE status = 'held' AND created_at < unixepoch() - ${HOLD_TTL_S}`,
  )
}

export const reservationRoutes = new Elysia({ prefix: '/reservation' })
  .use(authMiddleware)
  .post('/hold', async ({ body, user, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    const { seatId } = body

    clearExpiredHolds()

    try {
      sqlite.exec('BEGIN IMMEDIATE')

      const lockResult = sqlite.query(
        'UPDATE seats SET version = version + 1 WHERE id = ?'
      ).run(seatId)

      if (lockResult.changes === 0) {
        sqlite.exec('ROLLBACK')
        set.status = 404
        return { error: 'Seat not found' }
      }

      const existingReservation = sqlite.query(
        `SELECT 1 FROM reservations
         WHERE seat_id = ? AND status IN ('confirmed', 'held')
         LIMIT 1`
      ).get(seatId)

      if (existingReservation) {
        sqlite.exec('ROLLBACK')
        set.status = 409
        return { error: 'Seat is not available' }
      }

      const holdId = crypto.randomUUID()
      sqlite.query(`
        INSERT INTO reservations (id, user_id, seat_id, status)
        VALUES (?, ?, ?, 'held')
      `).run(holdId, user.id, seatId)

      sqlite.exec('COMMIT')

      set.status = 201
      return { id: holdId, seatId, status: 'held', ttlSeconds: HOLD_TTL_S }
    } catch (err) {
      try { sqlite.exec('ROLLBACK') } catch {}
      logger.error({ event: 'hold_failed', error: String(err) })
      set.status = 500
      return { error: 'Hold reservation failed due to server error' }
    }
  }, {
    body: t.Object({
      seatId: t.Number({ minimum: 1 }),
    }),
  })
  .post('/finalize', async ({ body, user, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    const { seatId, paymentId } = body

    try {
      sqlite.exec('BEGIN IMMEDIATE')

      // Optimistic concurrency: read version, then update with version check
      const seat = sqlite.query(
        'SELECT version FROM seats WHERE id = ?'
      ).get(seatId) as { version: number } | undefined

      if (!seat) {
        sqlite.exec('ROLLBACK')
        set.status = 404
        return { error: 'Seat not found' }
      }

      const updated = sqlite.query(
        'UPDATE seats SET version = version + 1 WHERE id = ? AND version = ?'
      ).run(seatId, seat.version)

      if (updated.changes === 0) {
        sqlite.exec('ROLLBACK')
        set.status = 409
        return { error: 'Concurrent modification, please retry' }
      }

      // Clear expired holds first
      clearExpiredHolds()

      // Check if seat already confirmed
      const existingReservation = sqlite.query(
        `SELECT 1 FROM reservations
         WHERE seat_id = ? AND status = 'confirmed'
         LIMIT 1`
      ).get(seatId)

      if (existingReservation) {
        sqlite.exec('ROLLBACK')
        set.status = 409
        return { error: 'Seat already reserved' }
      }

      // Delete any existing hold for this user + seat, then insert confirmed
      sqlite.query(
        `DELETE FROM reservations WHERE seat_id = ? AND user_id = ? AND status = 'held'`
      ).run(seatId, user.id)

      const reservationId = crypto.randomUUID()
      sqlite.query(`
        INSERT INTO reservations (id, user_id, seat_id, status, payment_id)
        VALUES (?, ?, ?, 'confirmed', ?)
      `).run(reservationId, user.id, seatId, paymentId)

      sqlite.exec('COMMIT')

      invalidateSeatsCache()

      set.status = 201
      return {
        id: reservationId,
        seatId,
        status: 'confirmed',
        paymentId,
      }
    } catch (err) {
      try { sqlite.exec('ROLLBACK') } catch {}
      logger.error({ event: 'finalize_failed', error: String(err) })
      set.status = 500
      return { error: 'Reservation failed due to server error' }
    }
  }, {
    body: t.Object({
      seatId: t.Number({ minimum: 1 }),
      paymentId: t.String({ minLength: 1 }),
    }),
  })
  .get('/mine', ({ user, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    const reservations = sqlite.query(`
      SELECT r.id, r.seat_id, r.status, r.payment_id, r.created_at,
             s.label as seat_label
      FROM reservations r
      JOIN seats s ON r.seat_id = s.id
      WHERE r.user_id = ? AND r.status IN ('confirmed', 'held')
      ORDER BY r.created_at DESC
    `).all(user.id)

    return { reservations }
  })