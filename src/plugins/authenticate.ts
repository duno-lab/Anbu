import type { FastifyReply, FastifyRequest, preHandlerHookHandler } from 'fastify'

import { verifyAccessToken } from '../modules/auth/access-token.service.js'
import { getAuthenticatedUser } from '../modules/auth/auth.service.js'

export interface AuthenticatedUser {
  id: string
}

declare module 'fastify' {
  interface FastifyRequest {
    user: AuthenticatedUser | null
  }
}

export const authenticate: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  const authorization = request.headers.authorization
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  if (!token) {
    return reply.status(401).send({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentification requise.',
      },
    })
  }

  let payload: { userId: string; sessionId: string }

  try {
    payload = await verifyAccessToken(token)
  } catch {
    return reply.status(401).send({
      error: {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Token invalide ou expiré.',
      },
    })
  }

  // Verify that the session is still active in the database.
  const user = await getAuthenticatedUser(payload.userId, payload.sessionId)

  if (!user) {
    return reply.status(401).send({
      error: {
        code: 'INVALID_SESSION',
        message: 'Session invalide ou expirée.',
      },
    })
  }

  request.user = { id: user.id }
}

export const authenticateOptional: preHandlerHookHandler = async (
  request: FastifyRequest,
  reply: FastifyReply
) => {
  request.user = null

  const authorization = request.headers.authorization
  const match = authorization?.match(/^Bearer\s+(.+)$/i)
  const token = match?.[1]?.trim()

  // No token means a public visitor.
  if (!token) return

  let payload: { userId: string; sessionId: string }

  try {
    payload = await verifyAccessToken(token)
  } catch {
    return reply.status(401).send({
      error: {
        code: 'INVALID_ACCESS_TOKEN',
        message: 'Token invalide ou expiré.',
      },
    })
  }

  const user = await getAuthenticatedUser(payload.userId, payload.sessionId)

  if (!user) {
    return reply.status(401).send({
      error: {
        code: 'INVALID_SESSION',
        message: 'Session invalide ou expirée.',
      },
    })
  }

  request.user = { id: user.id }
}
