import { z } from 'zod'

export const createAnswerSchema = z.object({
  content: z.string().trim().min(10).max(100_000),
})

export const updateAnswerSchema = z.object({
  content: z.string().trim().min(10).max(100_000),
})

export const answerIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const questionIdParamsSchema = z.object({
  questionId: z.string().uuid(),
})

export const listAnswersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export type CreateAnswerInput = z.infer<typeof createAnswerSchema>
export type UpdateAnswerInput = z.infer<typeof updateAnswerSchema>
export type ListAnswersQuery = z.infer<typeof listAnswersQuerySchema>
