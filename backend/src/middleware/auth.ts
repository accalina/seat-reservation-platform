import Elysia from 'elysia'
import { sqlite } from '../db/connection'

/**
 * Auth middleware plugin.
 * Parses sessionId from the raw Cookie header using Elysia's built-in cookie plugin.
 * Apply with: .use(authMiddleware())
 */
export const authMiddleware = (app: Elysia) =>
  app.derive(async ({ headers }) => {
    const raw = headers['cookie'] || headers['Cookie'] || ''
    const sessionId = raw
      .split(';')
      .map(c => c.trim())
      .find(c => c.startsWith('sessionId='))
      ?.split('=')[1]

    if (!sessionId) {
      return { user: null, sessionId: null, authError: 'Authentication required' }
    }

    const session = sqlite
      .query(
        `SELECT s.*, u.email, u.id as user_id
FROM sessions s
JOIN users u ON s.user_id = u.id
WHERE s.id = ?`,
      )
      .get(sessionId) as any

    if (!session) {
      return { user: null, sessionId: null, authError: 'Invalid session' }
    }

    if (new Date(session.expires_at).getTime() < Date.now()) {
      sqlite.query('DELETE FROM sessions WHERE id = ?').run(sessionId)
      return { user: null, sessionId: null, authError: 'Session expired' }
    }

    return {
      user: { id: session.user_id, email: session.email },
      sessionId: session.id,
      authError: null,
    }
  })
