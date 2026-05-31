import pino from 'pino'

const isDev = process.env.NODE_ENV === 'development'

// pino.transport() is not compatible with Bun, so we avoid it entirely.
// In development, we still get readable output from the default pino format.
export const logger = pino({
  level: process.env.LOG_LEVEL || (isDev ? 'debug' : 'info'),
})