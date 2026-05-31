/**
 * Authentication Integration Tests
 *
 * Run with: bun run src/tests/auth.test.ts
 * Requires: backend server running on localhost:3000
 *
 * Setup before running:
 *   cd backend && rm -f data/seat-reservation.db* && bun run src/db/migrate.ts && bun run src/index.ts &
 *
 * Tests all auth endpoints: register, login, logout, /me, error cases.
 */

const BASE = 'http://localhost:3000/api/auth'

let passed = 0
let failed = 0

function assert(label: string, condition: boolean, detail?: string) {
  if (condition) {
    console.log(`  ✅ ${label}`)
    passed++
  } else {
    console.log(`  ❌ ${label}${detail ? ` — ${detail}` : ''}`)
    failed++
  }
}

async function test() {
  // ── Test 1: Register new user ────────────────────────────────────
  console.log('\n=== Test 1: Register new user ===')
  const registerRes = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  })
  const registerBody = await registerRes.json()
  assert('Returns 201', registerRes.status === 201)
  assert('Has userId', typeof registerBody.userId === 'string')
  assert('Message says success', registerBody.message === 'User registered successfully')

  // ── Test 2: Register duplicate email ──────────────────────────────
  console.log('\n=== Test 2: Register duplicate email ===')
  const dupRes = await fetch(`${BASE}/register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  })
  const dupBody = await dupRes.json()
  assert('Returns 409', dupRes.status === 409)
  assert('Error says already registered', dupBody.error === 'Email already registered')

  // ── Test 3: Login with valid credentials ──────────────────────────
  console.log('\n=== Test 3: Login with valid credentials ===')
  const loginRes = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'password123' }),
  })
  const loginBody = await loginRes.json()
  const setCookie = loginRes.headers.get('set-cookie') || ''
  assert('Returns 200', loginRes.status === 200)
  assert('Message says logged in', loginBody.message === 'Logged in successfully')
  assert('Returns user with email', loginBody.user?.email === 'test@example.com')
  assert('Sets sessionId cookie', setCookie.includes('sessionId='))
  assert('Cookie is httpOnly', setCookie.includes('HttpOnly') || setCookie.includes('httponly'))
  assert('Cookie has sameSite=lax', setCookie.includes('SameSite=Lax') || setCookie.includes('samesite=lax'))

  // Extract session cookie value for subsequent requests
  const sessionCookie = setCookie.split(';')[0]

  // ── Test 4: GET /me with valid session ────────────────────────────
  console.log('\n=== Test 4: GET /me with valid session ===')
  const meRes = await fetch(`${BASE}/me`, {
    headers: { Cookie: sessionCookie },
  })
  const meBody = await meRes.json()
  assert('Returns 200', meRes.status === 200)
  assert('Returns user with email', meBody.user?.email === 'test@example.com')
  assert('Returns user with id', typeof meBody.user?.id === 'string')

  // ── Test 5: GET /me without cookie (unauthorized) ─────────────────
  console.log('\n=== Test 5: GET /me without cookie ===')
  const noCookieRes = await fetch(`${BASE}/me`)
  const noCookieBody = await noCookieRes.json()
  assert('Returns 401', noCookieRes.status === 401)
  assert('Error says auth required', noCookieBody.error === 'Authentication required')

  // ── Test 6: Login with wrong password ─────────────────────────────
  console.log('\n=== Test 6: Login with wrong password ===')
  const wrongPwRes = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'test@example.com', password: 'wrongpassword' }),
  })
  const wrongPwBody = await wrongPwRes.json()
  assert('Returns 401', wrongPwRes.status === 401)
  assert('Error says invalid credentials', wrongPwBody.error === 'Invalid email or password')
  // Ensure same message as non-existent email (no user enumeration)
  // (tested in test 9 below)

  // ── Test 7: Logout ────────────────────────────────────────────────
  console.log('\n=== Test 7: Logout ===')
  const logoutRes = await fetch(`${BASE}/logout`, {
    method: 'POST',
    headers: { Cookie: sessionCookie },
  })
  const logoutBody = await logoutRes.json()
  assert('Returns 200', logoutRes.status === 200)
  assert('Message says logged out', logoutBody.message === 'Logged out successfully')

  // ── Test 8: GET /me after logout (session invalidated) ────────────
  console.log('\n=== Test 8: GET /me after logout ===')
  const afterLogoutRes = await fetch(`${BASE}/me`, {
    headers: { Cookie: sessionCookie },
  })
  const afterLogoutBody = await afterLogoutRes.json()
  assert('Returns 401', afterLogoutRes.status === 401)
  assert('Error says auth required', afterLogoutBody.error === 'Authentication required')

  // ── Test 9: Login with non-existent email ─────────────────────────
  console.log('\n=== Test 9: Login with non-existent email ===')
  const noUserRes = await fetch(`${BASE}/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email: 'nobody@example.com', password: 'password123' }),
  })
  const noUserBody = await noUserRes.json()
  assert('Returns 401', noUserRes.status === 401)
  assert('Error says invalid credentials (same as wrong password)', noUserBody.error === 'Invalid email or password')
  assert(
    'Same error message as wrong password (prevents user enumeration)',
    noUserBody.error === wrongPwBody.error,
  )

  // ── Summary ──────────────────────────────────────────────────────
  console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`)
  console.log(`  ${passed} passed, ${failed} failed, ${passed + failed} total`)
  console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n`)
  process.exit(failed > 0 ? 1 : 0)
}

test().catch((err) => {
  console.error('Test runner error:', err)
  process.exit(1)
})