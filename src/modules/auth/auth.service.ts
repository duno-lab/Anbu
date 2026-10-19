import { randomUUID } from 'node:crypto'
import { and, eq, gt, isNull } from 'drizzle-orm'

import { verifyAccessToken } from './access-token.service.js'

import { firebaseAuth } from '../../config/firebase.js'
import { db } from '../../db/index.js'
import { authAccounts, users } from '../../db/schema/index.js'
import { sessions } from '../../db/schema/sessions.js'
import { createAccessToken, createRefreshToken, hashRefreshToken } from './token.service.js'
import type { AuthProvider, OAuthRequest } from './auth.types.js'

interface AuthResult {
  accessToken: string
  refreshToken: string
  user: {
    id: string
    username: string
    email: string | null
    avatarUrl: string | null
  }
}
export interface AuthenticatedUser {
  id: string
  username: string
  email: string | null
  avatarUrl: string | null
}
export async function authenticateWithOAuth(input: OAuthRequest): Promise<AuthResult> {
  const decodedToken = await firebaseAuth.verifyIdToken(input.idToken)

  const firebaseUid = decodedToken.uid

  const firebaseProvider = decodedToken.firebase?.sign_in_provider

  const expectedProvider = input.provider === 'google' ? 'google.com' : 'facebook.com'

  if (firebaseProvider !== expectedProvider) {
    throw new Error('Invalid authentication provider')
  }

  const provider: AuthProvider = input.provider === 'google' ? 'GOOGLE' : 'FACEBOOK'

  const existingAccount = await db.query.authAccounts.findFirst({
    where: and(eq(authAccounts.provider, provider), eq(authAccounts.providerUserId, firebaseUid)),
  })

  let userId: string

  if (existingAccount) {
    userId = existingAccount.userId
  } else {
    userId = await createUserFromFirebase({
      firebaseUid,
      provider,
      email: decodedToken.email ?? null,
      displayName: decodedToken.name ?? decodedToken.email?.split('@')[0] ?? 'Player',
      avatarUrl: decodedToken.picture ?? null,
    })
  }

  const sessionId = randomUUID()

  const refreshToken = createRefreshToken()

  const refreshTokenHash = hashRefreshToken(refreshToken)

  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db.insert(sessions).values({
    id: sessionId,
    userId,
    refreshTokenHash,
    expiresAt,
  })

  const accessToken = await createAccessToken({
    userId,
    sessionId,
  })

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    throw new Error('User not found')
  }

  return {
    accessToken,
    refreshToken,
    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  }
}

interface CreateUserInput {
  firebaseUid: string
  provider: AuthProvider
  email: string | null
  displayName: string
  avatarUrl: string | null
}

async function createUserFromFirebase(input: CreateUserInput): Promise<string> {
  const userId = randomUUID()

  const username = await generateUniqueUsername(input.displayName)

  await db.transaction(async (tx) => {
    await tx.insert(users).values({
      id: userId,
      username,
      email: input.email,
      avatarUrl: input.avatarUrl,
    })

    await tx.insert(authAccounts).values({
      id: randomUUID(),
      userId,
      provider: input.provider,
      providerUserId: input.firebaseUid,
    })
  })

  return userId
}

async function generateUniqueUsername(displayName: string): Promise<string> {
  const base =
    displayName
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-zA-Z0-9]/g, '')
      .toLowerCase()
      .slice(0, 30) || 'player'

  let username = base
  let counter = 1

  while (true) {
    const existing = await db.query.users.findFirst({
      where: eq(users.username, username),
    })

    if (!existing) {
      return username
    }

    counter += 1
    username = `${base}${counter}`
  }
}
export async function refreshSession(refreshToken: string): Promise<AuthResult> {
  const refreshTokenHash = hashRefreshToken(refreshToken)

  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.refreshTokenHash, refreshTokenHash),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date())
    ),
  })

  if (!session) {
    throw new Error('Invalid refresh token')
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, session.userId),
  })

  if (!user) {
    throw new Error('User not found')
  }

  /*
   * Rotate the refresh token.
   */
  const newRefreshToken = createRefreshToken()

  const newRefreshTokenHash = hashRefreshToken(newRefreshToken)

  const newExpiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  await db
    .update(sessions)
    .set({
      refreshTokenHash: newRefreshTokenHash,

      expiresAt: newExpiresAt,
    })
    .where(eq(sessions.id, session.id))

  const accessToken = await createAccessToken({
    userId: user.id,
    sessionId: session.id,
  })

  return {
    accessToken,
    refreshToken: newRefreshToken,

    user: {
      id: user.id,
      username: user.username,
      email: user.email,
      avatarUrl: user.avatarUrl,
    },
  }
}
export async function logoutSession(refreshToken: string): Promise<void> {
  const refreshTokenHash = hashRefreshToken(refreshToken)

  await db
    .update(sessions)
    .set({
      revokedAt: new Date(),
    })
    .where(and(eq(sessions.refreshTokenHash, refreshTokenHash), isNull(sessions.revokedAt)))
}

export async function getAuthenticatedUser(
  userId: string,
  sessionId: string
): Promise<AuthenticatedUser | null> {
  const session = await db.query.sessions.findFirst({
    where: and(
      eq(sessions.id, sessionId),
      eq(sessions.userId, userId),
      isNull(sessions.revokedAt),
      gt(sessions.expiresAt, new Date())
    ),
  })

  if (!session) {
    return null
  }

  const user = await db.query.users.findFirst({
    where: eq(users.id, userId),
  })

  if (!user) {
    return null
  }

  return {
    id: user.id,
    username: user.username,
    email: user.email,
    avatarUrl: user.avatarUrl,
  }
}
