# Seat Reservation Platform

A full-stack seat reservation system demonstrating concurrency-safe booking
with ElysiaJS + Bun (backend) and React + Vite (frontend).

## Stack

| Layer | Technology | Why |
|---|---|---|
| Runtime | Bun | Fast startup, native TypeScript, built-in SQLite |
| Backend | ElysiaJS | Type-safe, performant, Bun-first, built-in validation |
| Frontend | React (Vite) | Standard SPA, clear separation from API |
| Database | SQLite via `bun:sqlite` | Zero-dependency, sufficient for prototype |
| ORM | Drizzle ORM | Type-safe schema, composable queries |
| Auth | Session-based (HTTP-only cookie) | Server-side invalidation, 90-day expiry |
| Validation | Zod | Rich error messages, `.refine()` support |

## Prerequisites

- **Bun** >= 1.1.0 ([install guide](https://bun.sh))
- (Optional) **sqlite3** CLI for inspecting the database

## Quick Start

```bash
# 1. Install all dependencies
bun install:all

# 2. Set up database (migrate + seed)
bun db:setup

# 3. Start both backend and frontend
bun dev
```

- Backend: http://localhost:3000
- Frontend: http://localhost:5173

## Test Credentials

After running seed:
- Email: `user@test.com`
- Password: `password123`

## API Endpoints

### Auth
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/auth/register` | Public | Create new account |
| POST | `/api/auth/login` | Public | Login, get session |
| GET | `/api/auth/me` | Session | Current user info |
| POST | `/api/auth/logout` | Session | End session |

### Seats
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/seats` | Session | List seats + availability |

### Payment (Mock)
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/payment` | Session | Process mock payment |

### Reservation
| Method | Path | Auth | Description |
|---|---|---|---|
| POST | `/api/reservation/finalize` | Session | Finalize reservation (safe) |
| GET | `/api/reservation/mine` | Session | User's confirmed reservations |

### System
| Method | Path | Auth | Description |
|---|---|---|---|
| GET | `/api/health` | Public | Health check |

## Architecture Decisions

### Why Session-Based Auth (Not JWT)?
- Server-side session invalidation (logout, admin revoke)
- Natural 90-day expiry via DB timestamp + cookie maxAge
- No token refresh complexity
- No JWT secret rotation concerns

### Concurrency Control
Uses SQLite `BEGIN IMMEDIATE` transaction + row version increment to guarantee
serializable isolation. This prevents double booking even under concurrent requests
without needing a distributed lock.

```sql
BEGIN IMMEDIATE;              -- Write-lock the DB
UPDATE seats SET version = version + 1 WHERE id = ?;  -- Lock the row
SELECT 1 FROM reservations WHERE seat_id = ? AND status = 'confirmed';
-- If none exists → INSERT reservation
-- If exists → ROLLBACK, return 409
COMMIT;
```

### Mock Payment Design
- Random 200-1000ms delay simulates real payment processing
- 90% success rate tests resilience
- Returns `paymentId` (UUID) + `status: 'succeeded'` or `'failed'`

### No Pending Reservation State
By design, there is no "hold" or "pending" reservation state. This reduces complexity:
- Payment → Finalize is an atomic two-step flow
- No need for hold expiration / cleanup jobs
- Trade-off: User may pay for a seat that gets taken by another user during payment processing

## Testing

```bash
# Unit & integration tests
cd backend && bun test

# E2E manual test script
bash scripts/test-e2e.sh

# Load test for concurrency
bash scripts/load-test.sh
```

## Project Structure

```
seat-reservation-platform/
├── backend/
│   ├── src/
│   │   ├── index.ts              # App entry
│   │   ├── db/
│   │   │   ├── schema.ts         # Drizzle schema
│   │   │   ├── connection.ts     # DB instance
│   │   │   ├── migrate.ts        # Run migrations
│   │   │   ├── seed.ts           # Seed data
│   │   │   ├── backup.ts         # DB backup utility
│   │   │   └── validation.ts     # DB validation helpers
│   │   ├── routes/
│   │   │   ├── auth.ts           # Auth endpoints
│   │   │   ├── seats.ts          # Seat listing
│   │   │   ├── payment.ts        # Mock payment
│   │   │   └── reservation.ts    # Reservation finalize
│   │   ├── middleware/
│   │   │   ├── auth.ts           # Session validation
│   │   │   └── logger.ts         # Request logging
│   │   └── utils/
│   │       ├── hash.ts           # Password hashing
│   │       ├── logger.ts         # Pino logger
│   │       └── env.ts            # Env validation
│   └── tests/                    # Bun tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx               # Router + auth provider
│   │   ├── api.ts                # API client
│   │   ├── context/
│   │   │   └── AuthContext.tsx    # Auth state
│   │   └── pages/
│   │       ├── Login.tsx
│   │       ├── Seats.tsx
│   │       ├── Checkout.tsx
│   │       └── Confirmation.tsx
├── scripts/
│   ├── test-e2e.sh               # Manual E2E curl script
│   └── load-test.sh              # Concurrency test
├── .github/
│   └── workflows/
│       └── ci.yml                # CI pipeline
├── docker-compose.yml            # Production-like setup
└── package.json                  # Root orchestrator
```

## Known Limitations

- **SQLite single-writer**: Under extreme concurrency (>100 concurrent writes), SQLite's
  single-writer model becomes a bottleneck. For production, migrate to PostgreSQL.
- **No OAuth**: Only email/password auth. OAuth (Google, GitHub) could be added as an
  enhancement.
- **Mock payment**: No integration with real payment providers (Stripe, etc.).
- **No email verification**: Users can register without verifying their email.
- **No rate limiting on registration**: Could be spammed.

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| PORT | 3000 | Backend port |
| NODE_ENV | development | Environment |
| SESSION_SECRET | dev-secret-change-in-production | HMAC signing key |
| FRONTEND_URL | http://localhost:5173 | CORS allowed origin |
| LOG_LEVEL | info | Pino log level |

## Database Management

### Backup
```bash
cd backend
cp data/seat-reservation.db data/backups/backup-$(date +%Y%m%d-%H%M%S).db
# Or using VACUUM INTO for a clean copy:
sqlite3 data/seat-reservation.db "VACUUM INTO 'data/backups/backup-$(date +%Y%m%d-%H%M%S).db'"
```

### Reset
```bash
bun db:reset   # Deletes DB, re-runs migrations and seed
```

## API Error Codes

| HTTP Status | Code | Description |
|---|---|---|
| 400 | VALIDATION | Invalid request body |
| 401 | UNAUTHORIZED | Missing/invalid/expired session |
| 402 | PAYMENT_FAILED | Mock payment declined |
| 404 | NOT_FOUND | Resource not found |
| 409 | CONFLICT | Seat already reserved |
| 423 | LOCKED | Account temporarily locked |
| 429 | RATE_LIMITED | Too many requests |
| 500 | INTERNAL | Unexpected server error |

## Performance Benchmarks

| Metric | Value |
|---|---|
| Backend startup | < 100ms (Bun + Elysia) |
| API response (p50) | < 10ms (seats list) |
| Payment simulation | 200-1000ms (by design) |
| Concurrent booking | Serialized via SQLite transactions |

## Docker

```bash
docker compose up --build
```

## License

MIT