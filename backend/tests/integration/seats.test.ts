import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

const BASE = 'http://localhost:3000/api'

let cookieJar: string

describe('Seats API Integration', () => {
  beforeAll(async () => {
    const email = `int-test-${Date.now()}@example.com`
    await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
    const setCookie = loginRes.headers.get('set-cookie') || ''
    cookieJar = setCookie.split(';')[0]
  })

  it('GET /seats should return array of seats', async () => {
    const res = await fetch(`${BASE}/seats`, { headers: { Cookie: cookieJar } })
    expect(res.status).toBe(200)
    const data = await res.json()
    expect(Array.isArray(data)).toBe(true)
    expect(data.length).toBeGreaterThan(0)
    expect(data[0]).toHaveProperty('id')
    expect(data[0]).toHaveProperty('label')
    expect(data[0]).toHaveProperty('available')
  })

  it('GET /seats should return 401 without auth', async () => {
    const res = await fetch(`${BASE}/seats`)
    expect(res.status).toBe(401)
  })
})