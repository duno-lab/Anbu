import { SignJWT } from 'jose'
import { randomBytes, createHash } from 'node:crypto'
import { env } from '../../config/env.js'

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)

export interface AccessTokenPayload {
  userId: string
  sessionId: string
}

export async function createAccessToken(payload: AccessTokenPayload): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    sessionId: payload.sessionId,
  })
    .setProtectedHeader({
      alg: 'HS256',
    })
    .setSubject(payload.userId)
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(accessSecret)
}
export function createRefreshToken(): string {
  return randomBytes(48).toString('base64url')
}

export function hashRefreshToken(token: string): string {
  return createHash('sha256').update(token).digest('hex')
}
