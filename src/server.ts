import 'dotenv/config'

import Fastify from 'fastify'
import cors from '@fastify/cors'
import cookie from '@fastify/cookie'

import { env } from './config/env.js'
import { loggingPlugin } from './plugins/logging.js'
import { authRoutes } from './modules/auth/auth.routes.js'
import { articleRoutes } from './modules/articles/articles.routes.js'
import { tagsRoutes } from './modules/tags/tags.routes.js'
import { questionsRoutes } from './modules/questions/questions.routes.js'
import { answersRoutes } from './modules/answers/answers.routes.js'
import { searchRoutes } from './modules/search/search.routes.js'

import { logger } from './lib/logger.js'

function getErrorStatusCode(error: unknown): number {
  if (
    typeof error === 'object' &&
    error !== null &&
    'statusCode' in error &&
    typeof error.statusCode === 'number' &&
    error.statusCode >= 400 &&
    error.statusCode < 600
  ) {
    return error.statusCode
  }

  return 500
}

const app = Fastify({
  loggerInstance: logger,
  disableRequestLogging: true,
})

app.decorateRequest('user', null)

await app.register(cors, {
  origin: env.CORS_ORIGIN,
  credentials: true,
})

await app.register(cookie)

await app.register(loggingPlugin)

await app.register(authRoutes, {
  prefix: '/auth',
})

await app.register(articleRoutes, {
  prefix: '/articles',
})

await app.register(tagsRoutes, { prefix: '/tags' })

await app.register(questionsRoutes, { prefix: '/questions' })

await app.register(answersRoutes)

await app.register(searchRoutes)

app.get('/health', async () => {
  return {
    status: 'ok',
    service: 'lab-api',
  }
})

app.setErrorHandler(async (error, request, reply) => {
  request.log.error(
    {
      context: 'HTTP',
      error,
      method: request.method,
      url: request.url,
    },
    'Request failed'
  )

  const statusCode = getErrorStatusCode(error)

  return reply.status(statusCode).send({
    message:
      statusCode >= 500
        ? 'Internal server error'
        : error instanceof Error
          ? error.message
          : 'Request failed',
  })
})

const host = env.NODE_ENV === 'production' ? '0.0.0.0' : '127.0.0.1'

try {
  await app.listen({
    host,
    port: env.PORT,
  })

  app.log.info(
    {
      context: 'SERVER',
      environment: env.NODE_ENV,
      host,
      port: env.PORT,
    },
    'LAB API started'
  )
} catch (error) {
  app.log.fatal(
    {
      context: 'SERVER',
      error,
    },
    'Failed to start LAB API'
  )

  process.exit(1)
}
