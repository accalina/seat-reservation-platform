import { Elysia } from 'elysia'
import { cors } from '@elysiajs/cors'
import { cookie } from '@elysiajs/cookie'
import { env } from './utils/env'
import { logger } from './utils/logger'
import { requestLogger } from './middleware/logger'
import { publicAuthRoutes, protectedAuthRoutes } from './routes/auth'
import { seatsRoutes } from './routes/seats'
import { paymentRoutes } from './routes/payment'
import { reservationRoutes } from './routes/reservation'

const app = new Elysia()
  .use(requestLogger)
  .use(cors({ origin: env.FRONTEND_URL, credentials: true }))
  .use(cookie())
  .group('/api', (app) =>
    app
      .get('/health', () => ({
        status: 'ok',
        uptime: process.uptime(),
        timestamp: new Date().toISOString(),
      }))
      .use(publicAuthRoutes)
      .use(protectedAuthRoutes)
      .use(seatsRoutes)
      .use(paymentRoutes)
      .use(reservationRoutes)
  )
  .onError(({ code, error, set }) => {
    logger.error({ code, error: String(error) })
    if (code === 404) {
      set.status = 404
      return { error: 'Not found' }
    }
    if (code === 'VALIDATION') {
      set.status = 400
      return { error: 'Validation failed', details: String(error) }
    }
    set.status = 500
    return { error: 'Internal server error' }
  })
  .listen(env.PORT)

logger.info(`🦊 Elysia server running on http://localhost:${env.PORT}`)

const gracefulShutdown = async () => {
  logger.info('Shutting down gracefully...')
  await app.stop()
  process.exit(0)
}

process.on('SIGTERM', gracefulShutdown)
process.on('SIGINT', gracefulShutdown)