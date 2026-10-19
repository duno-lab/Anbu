import { z } from 'zod'

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),

  PORT: z.coerce.number().default(4000),

  DATABASE_URL: z.string().min(1),

  CORS_ORIGIN: z.string().url(),

  JWT_ACCESS_SECRET: z.string().min(32),

  JWT_REFRESH_SECRET: z.string().min(32),

  FIREBASE_PROJECT_ID: z.string().min(1),

  FIREBASE_CLIENT_EMAIL: z.string().email(),

  FIREBASE_PRIVATE_KEY: z.string().min(1),
})

export const env = envSchema.parse(process.env)
