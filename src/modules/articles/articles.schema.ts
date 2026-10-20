
import { z } from 'zod'

export const createArticleSchema = z.object({
  title: z.string().trim().min(5).max(200),
  excerpt: z.string().trim().max(500).optional(),
  content: z.string().trim().min(1).max(100_000),
})

export const updateArticleSchema = z.object({
  title: z.string().trim().min(5).max(200).optional(),
  excerpt: z.string().trim().max(500).nullable().optional(),
  content: z.string().trim().min(1).max(100_000).optional(),
})

export const articleIdParamsSchema = z.object({
  id: z.string().uuid(),
})

export const articleSlugParamsSchema = z.object({
  slug: z.string().min(1).max(220),
})

export const listArticlesQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(10),
})

export type CreateArticleInput = z.infer<typeof createArticleSchema>
export type UpdateArticleInput = z.infer<typeof updateArticleSchema>
export type ListArticlesQuery = z.infer<typeof listArticlesQuerySchema>
