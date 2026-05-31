import { createHmac, randomBytes } from 'node:crypto'

export async function hashPassword(password: string): Promise<string> {
  return Bun.password.hash(password)
}

export async function verifyPassword(
  password: string,
  hash: string,
): Promise<boolean> {
  return Bun.password.verify(password, hash)
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex')
}

export function signToken(token: string, secret: string): string {
  return createHmac('sha256', secret).update(token).digest('hex')
}