import type { FastifyPluginAsync } from 'fastify'

import { authenticate } from '../../plugins/authenticate.js'
import { createTagSchema, tagSlugParamsSchema, setArticleTagsSchema } from './tags.schema.js'

import { createTag, getTagBySlug, listTags, setArticleTags } from './tags.service.js'

export const tagsRoutes: FastifyPluginAsync = async (app) => {
  // GET /tags
  app.get('/', async (_request, reply) => {
    const items = await listTags()

    return reply.status(200).send({ items })
  })

  // GET /tags/:slug
  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const parsed = tagSlugParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TAG_SLUG',
          message: 'Le slug du tag est invalide.',
        },
      })
    }

    const tag = await getTagBySlug(parsed.data.slug)

    if (!tag) {
      return reply.status(404).send({
        error: {
          code: 'TAG_NOT_FOUND',
          message: 'Tag introuvable.',
        },
      })
    }

    return reply.status(200).send({ item: tag })
  })

  // POST /tags
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createTagSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TAG_DATA',
          message: 'Les données du tag sont invalides.',
          details: parsed.error.flatten(),
        },
      })
    }

    try {
      const tag = await createTag(parsed.data)

      return reply.status(201).send({ item: tag })
    } catch (error) {
      if (error instanceof Error && error.message === 'TAG_ALREADY_EXISTS') {
        return reply.status(409).send({
          error: {
            code: 'TAG_ALREADY_EXISTS',
            message: 'Un tag avec ce nom existe déjà.',
          },
        })
      }

      throw error
    }
  })

  // PUT /tags/articles/:articleId
  app.put<{
    Params: { articleId: string }
  }>('/articles/:articleId', { preHandler: authenticate }, async (request, reply) => {
    const articleId = request.params.articleId

    if (
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(articleId)
    ) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_ARTICLE_ID',
          message: "L'identifiant de l'article est invalide.",
        },
      })
    }

    const parsed = setArticleTagsSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TAG_IDS',
          message: 'La liste des tags est invalide.',
          details: parsed.error.flatten(),
        },
      })
    }

    try {
      const items = await setArticleTags(articleId, request.user!.id, parsed.data.tagIds)

      if (items === null) {
        return reply.status(404).send({
          error: {
            code: 'ARTICLE_NOT_FOUND',
            message: 'Article introuvable.',
          },
        })
      }

      return reply.status(200).send({ items })
    } catch (error) {
      if (error instanceof Error && error.message === 'TAG_NOT_FOUND') {
        return reply.status(400).send({
          error: {
            code: 'TAG_NOT_FOUND',
            message: 'Un ou plusieurs tags sont introuvables.',
          },
        })
      }

      throw error
    }
  })
}
