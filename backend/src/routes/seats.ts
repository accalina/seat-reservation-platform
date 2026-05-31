import { Elysia } from 'elysia'
import { sqlite } from '../db/connection'
import { authMiddleware } from '../middleware/auth'

const CACHE_TTL = 5000
let cachedSeats: { data: Array<{ id: number; label: string; available: boolean }>; timestamp: number } | null = null

export function invalidateSeatsCache() {
  cachedSeats = null
}

export const seatsRoutes = new Elysia({ prefix: '/seats' })
  .use(authMiddleware)
  .get('/', ({ user, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    if (cachedSeats && Date.now() - cachedSeats.timestamp < CACHE_TTL) {
      return cachedSeats.data
    }

    const seats = sqlite.query(`
      SELECT
        s.id,
        s.label,
        CASE WHEN r.seat_id IS NOT NULL THEN 0 ELSE 1 END as available
      FROM seats s
      LEFT JOIN reservations r
        ON s.id = r.seat_id
        AND r.status IN ('confirmed', 'held')
      ORDER BY s.id
    `).all() as Array<{ id: number; label: string; available: number }>

    const result = seats.map((seat) => ({
      id: seat.id,
      label: seat.label,
      available: seat.available === 1,
    }))

    cachedSeats = { data: result, timestamp: Date.now() }
    return result
  })