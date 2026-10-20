import pino, {
  type Logger,
} from 'pino'

import { env } from '../config/env.js'

export type LogContext =
  | 'SERVER'
  | 'HTTP'
  | 'AUTH'
  | 'DB'
  | 'USER'
  | 'ARTICLE'
  | 'QUESTION'
  | 'MODERATION'


function createBaseLogger(): Logger {
  const isDevelopment =
    env.NODE_ENV === 'development'

  return pino({
    level: isDevelopment
      ? 'debug'
      : 'info',

    ...(isDevelopment
      ? {
          transport: {
            target: 'pino-pretty',
            options: {
              colorize: true,
              translateTime: 'HH:MM:ss',
              ignore:
                'pid,hostname',
              singleLine: true,
            },
          },
        }
      : {}),
  })
}

export const logger =
  createBaseLogger()

export function createContextLogger(
  context: LogContext,
): Logger {
  return logger.child({
    context,
  })
}
