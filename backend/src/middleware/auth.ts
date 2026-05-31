import { Elysia } from 'elysia'
import { sqlite } from '../db/connection'

export const authMiddleware = new Elysia({
  name: 'auth-middleware',
}).derive(async ({ cookie }) => {
  const sessionId = cookie.sessionId?.value

  if (!sessionId) {
    return {
      user: null,
      sessionId: null,
      authError: 'Authentication required',
    }
  }

  // Look up session in DB
  const session = sqlite
    .query(
      `SELECT s.*, u.email, u.id as user_id
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.id = ?`,
    )
    .get(sessionId as string) as any

  if (!session) {
    return {
      user: null,
      sessionId: null,
      authError: 'Invalid session',
    }
  }

  // Check expiry
  if (new Date(session.expires_at).getTime() < Date.now()) {
    // Delete expired session
    sqlite.query('DELETE FROM sessions WHERE id = ?').run(sessionId as string)
    return {
      user: null,
      sessionId: null,
      authError: 'Session expired',
    }
  }

  return {
    user: {
      id: session.user_id,
      email: session.email,
    },
    sessionId: session.id,
    authError: null,
  }
})