import { z } from 'zod'

export const createQuestionSchema = z.object({
  title: z.string().trim().min(10).max(200),
  content: z.string().trim().min(20).max(100_000),
  tagIds: z.array(z.string().uuid()).min(1).max(5),
})

export const updateQuestionSchema = z
  .object({
    title: z.string().trim().min(10).max(200).optional(),
    content: z.string().trim().min(20).max(100_000).optional(),
    tagIds: z.array(z.string().uuid()).min(1).max(5).optional(),
  })
  .refine((data) => Object.values(data).some((value) => value !== undefined), {
    message: 'Au moins un champ doit être fourni.',
  })

export const questionIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const questionSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(220),
})

export const listQuestionsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
  tag: z.string().trim().min(1).max(70).optional(),
  status: z.enum(['OPEN', 'CLOSED']).default('OPEN'),
  isResolved: z
    .enum(['true', 'false'])
    .transform((value) => value === 'true')
    .optional(),
  sort: z.enum(['newest', 'mostAnswered', 'recentActivity']).default('newest'),
})

export const resolveQuestionSchema = z.object({
  isResolved: z.boolean(),
})

export const updateQuestionStatusSchema = z.object({
  status: z.enum(['OPEN', 'CLOSED']),
})

export type CreateQuestionInput = z.infer<typeof createQuestionSchema>
export type UpdateQuestionInput = z.infer<typeof updateQuestionSchema>
export type ListQuestionsQuery = z.infer<typeof listQuestionsQuerySchema>
export type ResolveQuestionInput = z.infer<typeof resolveQuestionSchema>
export type UpdateQuestionStatusInput = z.infer<typeof updateQuestionStatusSchema>
