import type { FastifyPluginAsync } from 'fastify'

import { authenticate } from '../../plugins/authenticate.js'

import {
  createQuestionSchema,
  listQuestionsQuerySchema,
  questionIdParamsSchema,
  questionSlugParamsSchema,
  updateQuestionSchema,
} from './questions.schema.js'

import {
  createQuestion,
  deleteQuestion,
  getQuestionBySlug,
  listQuestions,
  updateQuestion,
} from './questions.service.js'

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
}
