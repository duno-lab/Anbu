import type { FastifyInstance } from 'fastify'

import {
  articleIdParamsSchema,
  articleSlugParamsSchema,
  createArticleSchema,
  listArticlesQuerySchema,
  updateArticleSchema,
} from './articles.schema.js'

import {
  createArticle,
  deleteArticle,
  getPublishedArticleBySlug,
  listPublishedArticles,
  publishArticle,
  updateArticle,
} from './articles.service.js'

// À relier à ton authentification existante.
import { authenticate } from '../../plugins/authenticate.js'

export async function articleRoutes(app: FastifyInstance) {
  app.get('/', async (request, reply) => {
    const parsed = listArticlesQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paramètres de pagination invalides.',
        },
      })
    }

    return listPublishedArticles(parsed.data)
  })

  app.get('/:slug', async (request, reply) => {
    const params = articleSlugParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Slug invalide.',
        },
      })
    }

    const article = await getPublishedArticleBySlug(params.data.slug)

    if (!article) {
      return reply.status(404).send({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article introuvable.',
        },
      })
    }

    return { article }
  })

  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createArticleSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Données de l’article invalides.',
          issues: parsed.error.issues,
        },
      })
    }

    const article = await createArticle(request.user!.id, parsed.data)

    return reply.status(201).send({ article })
  })

  app.patch('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = articleIdParamsSchema.safeParse(request.params)
    const body = updateArticleSchema.safeParse(request.body)

    if (!params.success || !body.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Paramètres ou données invalides.',
        },
      })
    }

    if (Object.keys(body.data).length === 0) {
      return reply.status(400).send({
        error: {
          code: 'EMPTY_UPDATE',
          message: 'Aucune modification fournie.',
        },
      })
    }

    const article = await updateArticle(params.data.id, request.user!.id, body.data)

    if (!article) {
      return reply.status(404).send({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article introuvable.',
        },
      })
    }

    return { article }
  })

  app.post('/:id/publish', { preHandler: authenticate }, async (request, reply) => {
    const params = articleIdParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Identifiant invalide.',
        },
      })
    }

    const article = await publishArticle(params.data.id, request.user!.id)

    if (!article) {
      return reply.status(404).send({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article introuvable.',
        },
      })
    }

    return { article }
  })

  app.delete('/:id', { preHandler: authenticate }, async (request, reply) => {
    const params = articleIdParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Identifiant invalide.',
        },
      })
    }

    const deleted = await deleteArticle(params.data.id, request.user!.id)

    if (!deleted) {
      return reply.status(404).send({
        error: {
          code: 'ARTICLE_NOT_FOUND',
          message: 'Article introuvable.',
        },
      })
    }

    return reply.status(204).send()
  })
}
