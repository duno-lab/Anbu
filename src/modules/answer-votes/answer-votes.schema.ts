import { z } from 'zod'

export const answerVoteParamsSchema = z.object({
  answerId: z.string().uuid(),
})

export const answerVoteBodySchema = z.object({
  value: z.enum(['UP', 'DOWN']),
})

export type AnswerVoteValue = z.infer<typeof answerVoteBodySchema>['value']
