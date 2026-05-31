import { Elysia } from 'elysia'
import { logger } from '../utils/logger'

export const requestLogger = new Elysia()
  .onRequest(({ request }) => {
    const start = Date.now()
    ;(request as any)._startTime = start
  })
  .onAfterHandle(({ request, set }) => {
    const start = (request as any)._startTime
    const duration = Date.now() - start
    logger.info({
      method: request.method,
      path: new URL(request.url).pathname,
      status: set.status,
      duration: `${duration}ms`,
    })
  })