import { z } from 'zod'

export const createTagSchema = z.object({
  name: z.string().trim().min(2).max(50),
})

export const tagSlugParamsSchema = z.object({
  slug: z.string().trim().min(1).max(70),
})

export const setArticleTagsSchema = z.object({
  tagIds: z.array(z.string().uuid()).max(20),
})

export type CreateTagInput = z.infer<typeof createTagSchema>
export type SetArticleTagsInput = z.infer<typeof setArticleTagsSchema>
