import { randomUUID } from 'node:crypto'
import { and, count, eq } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { answers } from '../../db/schema/answers.js'
import { answerVotes } from '../../db/schema/answer-votes.js'

import type { AnswerVoteValue } from './answer-votes.schema.js'

export async function castAnswerVote(answerId: string, userId: string, value: AnswerVoteValue) {
  const [answer] = await db
    .select({
      id: answers.id,
      authorId: answers.authorId,
    })
    .from(answers)
    .where(eq(answers.id, answerId))
    .limit(1)

  if (!answer) {
    return { status: 'ANSWER_NOT_FOUND' } as const
  }

  if (answer.authorId === userId) {
    return { status: 'SELF_VOTE_NOT_ALLOWED' } as const
  }

  const [existingVote] = await db
    .select()
    .from(answerVotes)
    .where(and(eq(answerVotes.answerId, answerId), eq(answerVotes.userId, userId)))
    .limit(1)

  let currentVote: AnswerVoteValue | null

  if (!existingVote) {
    await db.insert(answerVotes).values({
      id: randomUUID(),
      answerId,
      userId,
      value,
    })

    currentVote = value
  } else if (existingVote.value === value) {
    await db.delete(answerVotes).where(eq(answerVotes.id, existingVote.id))

    currentVote = null
  } else {
    await db.update(answerVotes).set({ value }).where(eq(answerVotes.id, existingVote.id))

    currentVote = value
  }

  const voteCounts = await db
    .select({
      value: answerVotes.value,
      total: count(),
    })
    .from(answerVotes)
    .where(eq(answerVotes.answerId, answerId))
    .groupBy(answerVotes.value)

  const upvotes = Number(voteCounts.find((item) => item.value === 'UP')?.total ?? 0)

  const downvotes = Number(voteCounts.find((item) => item.value === 'DOWN')?.total ?? 0)

  return {
    status: 'VOTE_UPDATED' as const,
    vote: currentVote,
    upvotes,
    downvotes,
    score: upvotes - downvotes,
  }
}
