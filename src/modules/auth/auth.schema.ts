import { z } from 'zod'

export const oauthSchema = z.object({
  provider: z.enum(['google', 'facebook']),
  idToken: z.string().min(1),
})

export type OAuthInput = z.infer<typeof oauthSchema>
