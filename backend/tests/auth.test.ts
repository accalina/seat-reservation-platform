import { describe, it, expect } from 'bun:test'

describe('Password Hashing', () => {
  it('should hash and verify passwords correctly', async () => {
    const password = 'securePassword123'
    const hash = await Bun.password.hash(password)

    expect(hash).not.toBe(password)
    expect(hash.startsWith('$argon2id$')).toBe(true)

    const valid = await Bun.password.verify(password, hash)
    expect(valid).toBe(true)

    const invalid = await Bun.password.verify('wrongPassword', hash)
    expect(invalid).toBe(false)
  })
})

describe('Session Token Generation', () => {
  it('should generate unique session tokens', () => {
    const tokens = new Set<string>()
    for (let i = 0; i < 1000; i++) {
      const token = crypto.randomUUID()
      expect(tokens.has(token)).toBe(false)
      tokens.add(token)
    }
    expect(tokens.size).toBe(1000)
  })

  it('should generate 64-character hex tokens', () => {
    const bytes = new Uint8Array(32)
    crypto.getRandomValues(bytes)
    const token = Array.from(bytes).map((b) => b.toString(16).padStart(2, '0')).join('')
    expect(token.length).toBe(64)
  })
})