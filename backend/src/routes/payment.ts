import { Elysia, t } from 'elysia'
import { authMiddleware } from '../middleware/auth'
import { sqlite } from '../db/connection'
import { logger } from '../utils/logger'

const PAYMENT_TIMEOUT_MS = 5000

function processPayment(seatId: number): Promise<{ paymentId: string; status: string }> {
  const delay = Math.floor(Math.random() * 800) + 200
  return new Promise((resolve) => {
    setTimeout(() => {
      const isSuccess = Math.random() < 0.9
      if (!isSuccess) {
        resolve({ paymentId: '', status: 'failed' })
      } else {
        resolve({ paymentId: crypto.randomUUID(), status: 'succeeded' })
      }
    }, delay)
  })
}

export const paymentRoutes = new Elysia({ prefix: '/payment' })
  .use(authMiddleware)
  .post('/', async ({ body, user, set, headers }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }

    const { seatId } = body
    const idempotencyKey = headers['idempotency-key'] || ''

    // Check idempotency key
    if (idempotencyKey) {
      const cached = sqlite.query(
        'SELECT response FROM payment_idempotency WHERE key = ?'
      ).get(idempotencyKey) as { response: string } | undefined

      if (cached) {
        logger.info({ event: 'payment_idempotency_hit', key: idempotencyKey })
        return JSON.parse(cached.response)
      }
    }

    try {
      const paymentResult = await Promise.race([
        processPayment(seatId),
        new Promise<never>((_, reject) =>
          setTimeout(() => reject(new Error('Payment timeout')), PAYMENT_TIMEOUT_MS)
        ),
      ])

      if (paymentResult.status === 'failed') {
        // Store failed payment attempt
        sqlite.query(
          'INSERT INTO payments (id, user_id, seat_id, status) VALUES (?, ?, ?, ?)'
        ).run(crypto.randomUUID(), user.id, seatId, 'failed')

        set.status = 402
        const response = {
          status: 'failed',
          error: 'Payment declined. Please try again.',
        }

        if (idempotencyKey) {
          sqlite.query(
            'INSERT OR IGNORE INTO payment_idempotency (key, response) VALUES (?, ?)'
          ).run(idempotencyKey, JSON.stringify(response))
        }

        return response
      }

      // Store successful payment
      const paymentId = paymentResult.paymentId
      sqlite.query(
        'INSERT INTO payments (id, user_id, seat_id, status) VALUES (?, ?, ?, ?)'
      ).run(paymentId, user.id, seatId, 'succeeded')

      const response = { paymentId, status: 'succeeded' }

      if (idempotencyKey) {
        sqlite.query(
          'INSERT OR IGNORE INTO payment_idempotency (key, response) VALUES (?, ?)'
        ).run(idempotencyKey, JSON.stringify(response))
      }

      return response
    } catch (err: any) {
      if (err.message === 'Payment timeout') {
        set.status = 408
        return { error: 'Payment request timed out' }
      }
      throw err
    }
  }, {
    body: t.Object({
      seatId: t.Number({ minimum: 1 }),
    }),
  })