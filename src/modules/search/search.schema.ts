import { z } from 'zod'

export const searchQuerySchema = z.object({
  q: z.string().trim().min(2, 'La recherche doit contenir au moins 2 caractères.').max(100),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(20).default(10),
  type: z.enum(['all', 'articles', 'questions']).default('all'),
})

export type SearchQuery = z.infer<typeof searchQuerySchema>
