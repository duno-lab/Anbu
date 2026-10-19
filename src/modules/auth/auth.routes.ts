import type { FastifyInstance } from 'fastify'
import {
  authenticateWithOAuth,
  refreshSession,
  logoutSession,
  getAuthenticatedUser,
} from './auth.service.js'
import { verifyAccessToken } from './access-token.service.js'
import { oauthSchema } from './auth.schema.js'
import { eq } from 'drizzle-orm'

import { db } from '../../db/index.js'

import { users } from '../../db/schema/index.js'
export async function authRoutes(app: FastifyInstance) {
  app.post('/oauth', async (request, reply) => {
    const parsed = oauthSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        message: 'Invalid request',
        errors: parsed.error.flatten(),
      })
    }

    try {
      const result = await authenticateWithOAuth(parsed.data)

      reply.setCookie('kingdom_refresh', result.refreshToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
        maxAge: 30 * 24 * 60 * 60,
      })

      return reply.send({
        accessToken: result.accessToken,

        user: result.user,
      })
    } catch (error) {
      app.log.error(error)

      return reply.status(401).send({
        message: 'Authentication failed',
      })
    }
  })

  app.post('/refresh', async (request, reply) => {
    const refreshToken = request.cookies.kingdom_refresh

    if (!refreshToken) {
      return reply.status(401).send({
        message: 'Missing refresh token',
      })
    }

    try {
      const result = await refreshSession(refreshToken)

      reply.setCookie('kingdom_refresh', result.refreshToken, {
        httpOnly: true,

        secure: process.env.NODE_ENV === 'production',

        sameSite: 'lax',

        path: '/auth',

        maxAge: 30 * 24 * 60 * 60,
      })

      return reply.send({
        accessToken: result.accessToken,

        user: result.user,
      })
    } catch (error) {
      app.log.warn(error)

      reply.clearCookie('kingdom_refresh', {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        path: '/auth',
      })

      return reply.status(401).send({
        message: 'Invalid session',
      })
    }
  })
  app.get('/me', async (request, reply) => {
    const authorization = request.headers.authorization

    if (!authorization?.startsWith('Bearer ')) {
      return reply.status(401).send({
        message: 'Missing access token',
      })
    }

    const token = authorization.slice(7)

    try {
      const payload = await verifyAccessToken(token)

      const user = await getAuthenticatedUser(payload.userId, payload.sessionId)

      if (!user) {
        return reply.status(401).send({
          message: 'Session is no longer valid',
        })
      }

      return {
        user,
      }
    } catch {
      return reply.status(401).send({
        message: 'Invalid access token',
      })
    }
  })
  app.post('/logout', async (request, reply) => {
    const refreshToken = request.cookies.kingdom_refresh

    if (refreshToken) {
      await logoutSession(refreshToken)
    }

    reply.clearCookie('kingdom_refresh', {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/auth',
    })

    return reply.send({
      success: true,
    })
  })
}
