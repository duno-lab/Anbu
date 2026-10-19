import { jwtVerify } from 'jose'

import { env } from '../../config/env.js'

const accessSecret = new TextEncoder().encode(env.JWT_ACCESS_SECRET)

export interface AccessTokenPayload {
  userId: string
  sessionId: string
}

export async function verifyAccessToken(token: string): Promise<AccessTokenPayload> {
  const { payload } = await jwtVerify(token, accessSecret, {
    algorithms: ['HS256'],
  })

  if (typeof payload.userId !== 'string' || typeof payload.sessionId !== 'string') {
    throw new Error('Invalid access token')
  }

  return {
    userId: payload.userId,
    sessionId: payload.sessionId,
  }
}
