import type {
  FastifyInstance,
} from 'fastify'

export async function loggingPlugin(
  app: FastifyInstance,
): Promise<void> {
  app.addHook(
    'onResponse',
    async (request, reply) => {
      request.log.info(
        {
          context: 'HTTP',
          method: request.method,
          url: request.url,
          statusCode: reply.statusCode,
          durationMs: Math.round(
            reply.elapsedTime,
          ),
        },
        'Request completed',
      )
    },
  )
}
