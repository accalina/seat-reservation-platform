import { Elysia, t } from 'elysia'
import { rateLimit } from 'elysia-rate-limit'
import { sqlite } from '../db/connection'
import {
  hashPassword,
  verifyPassword,
  generateSessionToken,
} from '../utils/hash'

import { logger } from '../utils/logger'

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000

export const publicAuthRoutes = new Elysia({ prefix: '/auth' })
  .use(
    rateLimit({
      duration: 60000,
      max: 10,
      scoping: 'scoped',
      errorResponse: new Response(
        JSON.stringify({ error: 'Too many requests. Try again later.' }),
        { status: 429, headers: { 'Content-Type': 'application/json' } },
      ),
    }),
  )
  // POST /api/auth/register
  .post(
    '/register',
    async ({ body, set }) => {
      const { email, password } = body as { email: string; password: string }
      const id = crypto.randomUUID()
      const passwordHash = await hashPassword(password)

      try {
        sqlite
          .query('INSERT INTO users (id, email, password_hash) VALUES (?, ?, ?)')
          .run(id, email, passwordHash)

        logger.info({ event: 'user_registered', userId: id, email })
        set.status = 201
        return { message: 'User registered successfully', userId: id }
      } catch (err: any) {
        if (String(err).includes('UNIQUE')) {
          set.status = 409
          return { error: 'Email already registered' }
        }
        throw err
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String({ minLength: 6 }),
      }),
    },
  )
  // POST /api/auth/login
  .post(
    '/login',
    async ({ body, set, cookie }) => {
      const { email, password } = body as { email: string; password: string }

      const user = sqlite.query('SELECT * FROM users WHERE email = ?').get(
        email,
      ) as any

      if (!user) {
        logger.warn({ event: 'login_failure', email, reason: 'user_not_found' })
        set.status = 401
        return { error: 'Invalid email or password' }
      }

      const valid = await verifyPassword(password, user.password_hash)
      if (!valid) {
        logger.warn({ event: 'login_failure', email, reason: 'invalid_password' })
        set.status = 401
        return { error: 'Invalid email or password' }
      }

      // Create session
      const sessionId = generateSessionToken()
      const expiresAt = new Date(Date.now() + NINETY_DAYS_MS)

      sqlite
        .query(
          'INSERT INTO sessions (id, user_id, expires_at) VALUES (?, ?, ?)',
        )
        .run(sessionId, user.id, expiresAt.getTime())

      // Set cookie
      cookie.sessionId!.set({
        value: sessionId,
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/',
        maxAge: NINETY_DAYS_MS / 1000,
      })

      logger.info({ event: 'login_success', userId: user.id, email: user.email })
      return {
        message: 'Logged in successfully',
        user: { id: user.id, email: user.email },
      }
    },
    {
      body: t.Object({
        email: t.String({ format: 'email' }),
        password: t.String(),
      }),
    },
  )

export const protectedAuthRoutes = new Elysia({ prefix: '/auth' })
  .derive(async ({ cookie }) => {
    const sessionId = cookie.sessionId?.value

    if (!sessionId) {
      return { user: undefined, sessionId: undefined }
    }

    const session = sqlite
      .query(
        `SELECT s.*, u.email, u.id as user_id
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.id = ?`,
      )
      .get(sessionId as string) as any

    if (!session) {
      return { user: undefined, sessionId: undefined }
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      sqlite.query('DELETE FROM sessions WHERE id = ?').run(sessionId as string)
      return { user: undefined, sessionId: undefined }
    }

    return {
      user: { id: session.user_id, email: session.email },
      sessionId: session.id,
    }
  })
  .get('/me', ({ user, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }
    return { user }
  })
  .post('/logout', ({ user, sessionId, cookie, set }: any) => {
    if (!user) {
      set.status = 401
      return { error: 'Authentication required' }
    }
    sqlite.query('DELETE FROM sessions WHERE id = ?').run(sessionId as string)
    cookie.sessionId!.remove()
    logger.info({ event: 'user_logout', sessionId })
    return { message: 'Logged out successfully' }
  })