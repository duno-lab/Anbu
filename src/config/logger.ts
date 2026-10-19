import type { FastifyServerOptions } from 'fastify'

import { env } from './env.js'

export function createLogger(): FastifyServerOptions['logger'] {
  const isDevelopment =
    env.NODE_ENV === 'development'

  return {
    level: isDevelopment
      ? 'debug'
      : 'info',
    serializers: {
      req(request) {
        return {
          method: request.method,
          url: request.url,
          userAgent:
            request.headers['user-agent'],
        }
      },

      res(reply) {
        return {
          statusCode: reply.statusCode,
        }
      },

      err(error) {
        return {
          type: error.name,
          message: error.message,
          stack: error.stack ?? '',
        }
      },
    },

    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore:
                'pid,hostname,req,res,responseTime',
              singleLine: true,
              messageFormat:
                '{context} {msg}',
            },
          },
        }
      : {}),
  }
}
