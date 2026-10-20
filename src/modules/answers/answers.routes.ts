import type { FastifyPluginAsync } from 'fastify'

import { authenticate } from '../../plugins/authenticate.js'

import {
  answerIdParamsSchema,
  createAnswerSchema,
  listAnswersQuerySchema,
  questionIdParamsSchema,
  updateAnswerSchema,
} from './answers.schema.js'

import { createAnswer, deleteAnswer, listAnswers, updateAnswer } from './answers.service.js'

export const answersRoutes: FastifyPluginAsync = async (app) => {
  // GET /questions/:questionId/answers
  app.get<{ Params: { questionId: string } }>(
    '/questions/:questionId/answers',
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

      const parsed = listAnswersQuerySchema.safeParse(request.query)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_QUERY',
            message: 'Les paramètres de pagination sont invalides.',
            details: parsed.error.flatten(),
          },
        })
      }

      const result = await listAnswers(params.data.questionId, parsed.data)

      if (!result) {
        return reply.status(404).send({
          error: {
            code: 'QUESTION_NOT_FOUND',
            message: 'Question introuvable.',
          },
        })
      }

      return reply.status(200).send(result)
    }
  )

  // POST /questions/:questionId/answers
  app.post<{ Params: { questionId: string } }>(
    '/questions/:questionId/answers',
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

      const parsed = createAnswerSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_ANSWER_DATA',
            message: 'Les données de la réponse sont invalides.',
            details: parsed.error.flatten(),
          },
        })
      }

      const result = await createAnswer(params.data.questionId, request.user!.id, parsed.data)

      if (result.status === 'QUESTION_NOT_FOUND') {
        return reply.status(404).send({
          error: {
            code: 'QUESTION_NOT_FOUND',
            message: 'Question introuvable.',
          },
        })
      }

      if (result.status === 'QUESTION_CLOSED') {
        return reply.status(409).send({
          error: {
            code: 'QUESTION_CLOSED',
            message: 'Cette question est fermée et ne peut plus recevoir de réponses.',
          },
        })
      }

      return reply.status(201).send({ item: result.answer })
    }
  )

  // PATCH /answers/:id
  app.patch<{ Params: { id: string } }>(
    '/answers/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const params = answerIdParamsSchema.safeParse(request.params)

      if (!params.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_ANSWER_ID',
            message: "L'identifiant de la réponse est invalide.",
          },
        })
      }

      const parsed = updateAnswerSchema.safeParse(request.body)

      if (!parsed.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_ANSWER_DATA',
            message: 'Les données de modification sont invalides.',
            details: parsed.error.flatten(),
          },
        })
      }

      const answer = await updateAnswer(params.data.id, request.user!.id, parsed.data)

      if (!answer) {
        return reply.status(404).send({
          error: {
            code: 'ANSWER_NOT_FOUND',
            message: 'Réponse introuvable.',
          },
        })
      }

      return reply.status(200).send({ item: answer })
    }
  )

  // DELETE /answers/:id
  app.delete<{ Params: { id: string } }>(
    '/answers/:id',
    { preHandler: authenticate },
    async (request, reply) => {
      const params = answerIdParamsSchema.safeParse(request.params)

      if (!params.success) {
        return reply.status(400).send({
          error: {
            code: 'INVALID_ANSWER_ID',
            message: "L'identifiant de la réponse est invalide.",
          },
        })
      }

      const deleted = await deleteAnswer(params.data.id, request.user!.id)

      if (!deleted) {
        return reply.status(404).send({
          error: {
            code: 'ANSWER_NOT_FOUND',
            message: 'Réponse introuvable.',
          },
        })
      }

      return reply.status(204).send()
    }
  )
}
