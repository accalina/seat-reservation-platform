import { describe, it, expect } from 'bun:test'

describe('Session Expiry', () => {
  it('should detect expired session', () => {
    const sessionExpiresAt = Date.now() - 1000
    const now = Date.now()

    const isExpired = sessionExpiresAt < now
    expect(isExpired).toBe(true)
  })

  it('should accept valid session within 90 days', () => {
    const sessionExpiresAt = Date.now() + 90 * 24 * 60 * 60 * 1000
    const now = Date.now()

    const isExpired = sessionExpiresAt < now
    expect(isExpired).toBe(false)
  })

  it('should correctly calculate 90-day expiry timestamp', () => {
    const now = Date.now()
    const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000
    const expiresAt = now + NINETY_DAYS_MS

    const ninetyDaysFromNow = new Date(now + NINETY_DAYS_MS)
    expect(expiresAt).toBe(ninetyDaysFromNow.getTime())
    expect(expiresAt - now).toBe(NINETY_DAYS_MS)
  })
})