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

import {
  answerVoteBodySchema,
  answerVoteParamsSchema,
} from '../answer-votes/answer-votes.schema.js'

import { castAnswerVote } from '../answer-votes/answer-votes.service.js'

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

  // PUT /answers/:answerId/vote
  app.put('/answers/:answerId/vote', async (request, reply) => {
    if (!request.user) {
      return reply.code(401).send({
        message: 'Authentification requise.',
      })
    }

    const params = answerVoteParamsSchema.safeParse(request.params)

    if (!params.success) {
      return reply.code(400).send({
        message: 'Identifiant de réponse invalide.',
      })
    }

    const body = answerVoteBodySchema.safeParse(request.body)

    if (!body.success) {
      return reply.code(400).send({
        message: 'Vote invalide. Utilise UP ou DOWN.',
        errors: body.error.flatten(),
      })
    }

    const result = await castAnswerVote(params.data.answerId, request.user.id, body.data.value)

    if (result.status === 'ANSWER_NOT_FOUND') {
      return reply.code(404).send({
        message: 'Réponse introuvable.',
      })
    }

    if (result.status === 'SELF_VOTE_NOT_ALLOWED') {
      return reply.code(403).send({
        message: 'Tu ne peux pas voter pour ta propre réponse.',
      })
    }

    return reply.code(200).send({
      message: result.vote ? 'Vote enregistré.' : 'Vote retiré.',
      vote: result.vote,
      upvotes: result.upvotes,
      downvotes: result.downvotes,
      score: result.score,
    })
  })
}
