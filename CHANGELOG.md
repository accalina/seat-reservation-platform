# Changelog

## [Unreleased]

## [1.0.0] - YYYY-MM-DD
### Added
- User registration and login with session-based auth
- Seat listing with availability status
- Mock payment processing (90% success rate)
- Concurrent-safe reservation finalization
- Frontend SPA with React + Vite

### Known Limitations
- SQLite single-writer bottleneck at high concurrency
- No OAuth integration
- No email verification