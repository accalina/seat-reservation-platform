import { describe, it, expect, beforeAll, afterAll } from 'bun:test'

const BASE = 'http://localhost:3000/api'

let cookieJar: string
let userId: string
let seatId = 1

describe('Reservation API Integration', () => {
  beforeAll(async () => {
    const email = `res-int-test-${Date.now()}@example.com`
    const registerRes = await fetch(`${BASE}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
    const registerBody = await registerRes.json()
    userId = registerBody.userId

    const loginRes = await fetch(`${BASE}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password: 'password123' }),
    })
    const setCookie = loginRes.headers.get('set-cookie') || ''
    cookieJar = setCookie.split(';')[0]
  })

  it('should complete full reservation flow: hold -> payment -> finalize', async () => {
    const seatsRes = await fetch(`${BASE}/seats`, { headers: { Cookie: cookieJar } })
    const seats = await seatsRes.json()
    const availableSeat = seats.find((s: any) => s.available)
    if (!availableSeat) return
    seatId = availableSeat.id

    const holdRes = await fetch(`${BASE}/reservation/hold`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ seatId }),
    })
    const holdBody = await holdRes.json()
    expect(holdRes.status).toBe(201)
    expect(holdBody.status).toBe('held')

    const paymentRes = await fetch(`${BASE}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ seatId }),
    })
    const paymentBody = await paymentRes.json()
    expect(paymentRes.status).toBe(200)
    expect(paymentBody.paymentId).toBeTruthy()
    const paymentId = paymentBody.paymentId

    const finalizeRes = await fetch(`${BASE}/reservation/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ seatId, paymentId }),
    })
    const finalizeBody = await finalizeRes.json()
    expect(finalizeRes.status).toBe(201)
    expect(finalizeBody.status).toBe('confirmed')
  })

  it('should reject double booking with 409', async () => {
    const paymentRes = await fetch(`${BASE}/payment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ seatId }),
    })
    const paymentBody = await paymentRes.json()
    const paymentId = paymentBody.paymentId

    const res = await fetch(`${BASE}/reservation/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Cookie: cookieJar },
      body: JSON.stringify({ seatId, paymentId }),
    })
    const body = await res.json()
    expect(res.status).toBe(409)
    expect(body.error).toBe('Seat already reserved')
  })

  it('should return 401 for reservation without auth', async () => {
    const res = await fetch(`${BASE}/reservation/finalize`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ seatId: 1, paymentId: 'test-payment' }),
    })
    expect(res.status).toBe(401)
  })
})