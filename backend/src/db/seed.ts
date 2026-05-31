import { sqlite } from './connection'

console.log('🌱 Seeding database...')

// Insert 3 seats
sqlite.exec(`
  INSERT OR IGNORE INTO seats (id, label) VALUES
    (1, 'A1 - Window Seat'),
    (2, 'B2 - Aisle Seat'),
    (3, 'C3 - Middle Seat');
`)

// Insert a test user (password: "password123")
const passwordHash = await Bun.password.hash('password123')

sqlite.exec(`
  INSERT OR IGNORE INTO users (id, email, password_hash) VALUES
    ('test-user-001', 'user@test.com', '${passwordHash}');
`)

console.log('✅ Seed complete: 3 seats + test user created')
console.log('   Test login: user@test.com / password123')