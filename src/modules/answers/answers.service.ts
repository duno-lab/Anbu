import { randomUUID } from 'node:crypto'
import { and, count, desc, eq } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { answers } from '../../db/schema/answers.js'
import { questions } from '../../db/schema/questions.js'

import type { CreateAnswerInput, ListAnswersQuery, UpdateAnswerInput } from './answers.schema.js'

export async function createAnswer(questionId: string, authorId: string, input: CreateAnswerInput) {
  const [question] = await db
    .select({
      id: questions.id,
      status: questions.status,
    })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)

  if (!question) {
    return { status: 'QUESTION_NOT_FOUND' as const }
  }

  if (question.status !== 'OPEN') {
    return { status: 'QUESTION_CLOSED' as const }
  }

  const id = randomUUID()

  await db.insert(answers).values({
    id,
    questionId,
    authorId,
    content: input.content,
  })

  const [answer] = await db.select().from(answers).where(eq(answers.id, id)).limit(1)

  return {
    status: 'CREATED' as const,
    answer: answer!,
  }
}

export async function listAnswers(questionId: string, query: ListAnswersQuery) {
  const [question] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)

  if (!question) return null

  const offset = (query.page - 1) * query.limit
  const condition = eq(answers.questionId, questionId)

  const [items, countResult] = await Promise.all([
    db
      .select()
      .from(answers)
      .where(condition)
      .orderBy(desc(answers.createdAt), desc(answers.id))
      .limit(query.limit)
      .offset(offset),

    db.select({ total: count() }).from(answers).where(condition),
  ])

  const total = Number(countResult[0]?.total ?? 0)

  return {
    items,
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  }
}

export async function updateAnswer(answerId: string, authorId: string, input: UpdateAnswerInput) {
  const [existing] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.id, answerId), eq(answers.authorId, authorId)))
    .limit(1)

  if (!existing) return null

  await db
    .update(answers)
    .set({
      content: input.content,
      updatedAt: new Date(),
    })
    .where(and(eq(answers.id, answerId), eq(answers.authorId, authorId)))

  const [updated] = await db.select().from(answers).where(eq(answers.id, answerId)).limit(1)

  return updated ?? null
}

export async function deleteAnswer(answerId: string, authorId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: answers.id })
    .from(answers)
    .where(and(eq(answers.id, answerId), eq(answers.authorId, authorId)))
    .limit(1)

  if (!existing) return false

  await db.delete(answers).where(and(eq(answers.id, answerId), eq(answers.authorId, authorId)))

  return true
}
