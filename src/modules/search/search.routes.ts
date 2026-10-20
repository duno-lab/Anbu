import type { FastifyPluginAsync } from 'fastify'

import { searchQuerySchema } from './search.schema.js'
import { searchContent } from './search.service.js'

export const searchRoutes: FastifyPluginAsync = async (app) => {
  // GET /search?q=typescript
  app.get('/search', async (request, reply) => {
    const parsed = searchQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_SEARCH_QUERY',
          message: 'Les paramètres de recherche sont invalides.',
          details: parsed.error.flatten(),
        },
      })
    }

    const result = await searchContent(parsed.data)

    return reply.status(200).send(result)
  })
}
