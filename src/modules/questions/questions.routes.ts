import type { FastifyPluginAsync } from 'fastify'

import { authenticate } from '../../plugins/authenticate.js'

import {
  createQuestionSchema,
  listQuestionsQuerySchema,
  questionIdParamsSchema,
  questionSlugParamsSchema,
  updateQuestionSchema,
  resolveQuestionSchema,
  updateQuestionStatusSchema,
} from './questions.schema.js'

import {
  createQuestion,
  deleteQuestion,
  getQuestionBySlug,
  listQuestions,
  updateQuestion,
  setQuestionStatus,
} from './questions.service.js'

import { setQuestionResolution } from './questions.service.js'

export const questionsRoutes: FastifyPluginAsync = async (app) => {
  // GET /questions
  app.get('/', async (request, reply) => {
    const parsed = listQuestionsQuerySchema.safeParse(request.query)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_QUERY',
          message: 'Les paramètres de recherche sont invalides.',
          details: parsed.error.flatten(),
        },
      })
    }

    return reply.status(200).send(await listQuestions(parsed.data))
  })

  // GET /questions/:slug
  app.get<{ Params: { slug: string } }>('/:slug', async (request, reply) => {
    const parsed = questionSlugParamsSchema.safeParse(request.params)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_QUESTION_SLUG',
          message: 'Le slug de la question est invalide.',
        },
      })
    }

    const question = await getQuestionBySlug(parsed.data.slug)

    if (!question) {
      return reply.status(404).send({
        error: {
          code: 'QUESTION_NOT_FOUND',
          message: 'Question introuvable.',
        },
      })
    }

    return reply.status(200).send({ item: question })
  })

  // POST /questions
  app.post('/', { preHandler: authenticate }, async (request, reply) => {
    const parsed = createQuestionSchema.safeParse(request.body)

    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_QUESTION_DATA',
          message: 'Les données de la question sont invalides.',
          details: parsed.error.flatten(),
        },
      })
    }

    try {
      const question = await createQuestion(request.user!.id, parsed.data)

      return reply.status(201).send({ item: question })
    } catch (error) {
      if (error instanceof Error) {
        if (error.message === 'TAG_NOT_FOUND') {
          return reply.status(400).send({
            error: {
              code: 'TAG_NOT_FOUND',
              message: 'Un ou plusieurs tags sont introuvables.',
            },
          })
        }

        if (error.message === 'DUPLICATE_TAG_IDS') {
          return reply.status(400).send({
            error: {
              code: 'DUPLICATE_TAG_IDS',
              message: 'Les tags ne doivent pas être dupliqués.',
            },
          })
        }
      }

      throw error
    }
  })

  // PATCH /questions/:id
  app.patch<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const params = questionIdParamsSchema.safeParse(request.params)

      if (!params.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_QUESTION_ID',
            message: "L'identifiant de la question est invalide.",
          },
        })
      }

      const parsed = updateQuestionSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_QUESTION_DATA',
            message: 'Les données de modification sont invalides.',
            details: parsed.error.flatten(),
          },
        })
      }

      try {
        const question = await updateQuestion(params.data.id, request.user!.id, parsed.data)

        if (!question) {
          return reply.status(404).send({
            error: {
              code: 'QUESTION_NOT_FOUND',
              message: 'Question introuvable.',
            },
          })
        }

        return reply.status(200).send({ item: question })
      } catch (error) {
        if (error instanceof Error) {
          if (error.message === 'TAG_NOT_FOUND') {
            return reply.status(400).send({
              error: {
                code: 'TAG_NOT_FOUND',
                message: 'Un ou plusieurs tags sont introuvables.',
              },
            })
          }

          if (error.message === 'DUPLICATE_TAG_IDS') {
            return reply.status(400).send({
              error: {
                code: 'DUPLICATE_TAG_IDS',
                message: 'Les tags ne doivent pas être dupliqués.',
              },
            })
          }
        }

        throw error
      }
    }
  )

  // DELETE /questions/:id
  app.delete<{ Params: { id: string } }>(
    '/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const parsed = questionIdParamsSchema.safeParse(request.params)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_QUESTION_ID',
            message: "L'identifiant de la question est invalide.",
          },
        })
      }

      const deleted = await deleteQuestion(parsed.data.id, request.user!.id)

      if (!deleted) {
        return reply.status(404).send({
          error: {
            code: 'QUESTION_NOT_FOUND',
            message: 'Question introuvable.',
          },
        })
      }

      return reply.status(204).send()
    }
  )

  // PATCH /questions/:id/resolve
  app.patch<{ Params: { id: string } }>('/:id/resolve', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        message: 'Authentification requise.',
      })
    }

    const params = questionIdParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.code(400).send({
        message: 'Identifiant de question invalide.',
      })
    }

    const body = resolveQuestionSchema.safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({
        message: 'Corps de requête invalide.',
        errors: body.error.flatten(),
      })
    }

    const result = await setQuestionResolution(
      params.data.id,
      request.user.id,
      body.data.isResolved
    )

    if (result.status === 'QUESTION_NOT_FOUND') {
      return reply.code(404).send({
        message: 'Question introuvable.',
      })
    }

    if (result.status === 'FORBIDDEN') {
      return reply.code(403).send({
        message: 'Seul l’auteur peut modifier la résolution.',
      })
    }

    if (result.status !== 'UPDATED') {
      return reply.code(500).send({
        message: 'Impossible de mettre à jour la question.',
      })
    }

    return reply.code(200).send({
      message: result.question.isResolved
        ? 'Question marquée comme résolue.'
        : 'Question marquée comme non résolue.',
      question: result.question,
    })
  })

  // PATCH /questions/:id/status
  app.patch('/:id/status', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        message: 'Authentification requise.',
      })
    }

    const params = questionIdParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.code(400).send({
        message: 'Identifiant de question invalide.',
      })
    }

    const body = updateQuestionStatusSchema.safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({
        message: 'Statut invalide.',
        errors: body.error.flatten(),
      })
    }

    const result = await setQuestionStatus(params.data.id, request.user.id, body.data.status)

    if (result.status === 'QUESTION_NOT_FOUND') {
      return reply.code(404).send({
        message: 'Question introuvable.',
      })
    }

    if (result.status === 'FORBIDDEN') {
      return reply.code(403).send({
        message: 'Seul l’auteur peut modifier le statut.',
      })
    }

    if (result.status !== 'UPDATED') {
      return reply.code(500).send({
        message: 'Impossible de modifier le statut.',
      })
    }

    return reply.code(200).send({
      message: result.question.status === 'CLOSED' ? 'Discussion fermée.' : 'Discussion rouverte.',
      question: result.question,
    })
  })
}
