import { randomUUID } from 'node:crypto'
import { and, asc, count, desc, eq, exists, inArray, max, sql } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { users, tags, questions, answers, questionTags } from '../../db/schema/index.js'
import type {
  CreateQuestionInput,
  ListQuestionsQuery,
  UpdateQuestionInput,
} from './questions.schema.js'

function createSlugBase(title: string): string {
  return title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 180)
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = createSlugBase(title) || 'question'

  // Random suffix prevents most concurrent slug collisions.
  return `${base}-${randomUUID().slice(0, 8)}`
}

async function validateTagIds(tagIds: string[]): Promise<void> {
  const uniqueIds = [...new Set(tagIds)]

  if (uniqueIds.length !== tagIds.length) {
    throw new Error('DUPLICATE_TAG_IDS')
  }

  if (uniqueIds.length === 0) {
    throw new Error('QUESTION_REQUIRES_TAG')
  }

  const existingTags = await db
    .select({ id: tags.id })
    .from(tags)
    .where(inArray(tags.id, uniqueIds))

  if (existingTags.length !== uniqueIds.length) {
    throw new Error('TAG_NOT_FOUND')
  }
}

async function getTagsByQuestionIds(questionIds: string[]) {
  const result = new Map<string, Array<{ id: string; name: string; slug: string }>>()

  if (questionIds.length === 0) return result

  const rows = await db
    .select({
      questionId: questionTags.questionId,
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(questionTags)
    .innerJoin(tags, eq(questionTags.tagId, tags.id))
    .where(inArray(questionTags.questionId, questionIds))
    .orderBy(asc(tags.name))

  for (const row of rows) {
    const current = result.get(row.questionId) ?? []

    current.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
    })

    result.set(row.questionId, current)
  }

  return result
}

export async function createQuestion(authorId: string, input: CreateQuestionInput) {
  const tagIds = [...new Set(input.tagIds)]

  if (tagIds.length !== input.tagIds.length) {
    throw new Error('DUPLICATE_TAG_IDS')
  }

  await validateTagIds(tagIds)

  const id = randomUUID()
  const slug = await generateUniqueSlug(input.title)

  await db.transaction(async (tx) => {
    await tx.insert(questions).values({
      id,
      authorId,
      title: input.title,
      slug,
      content: input.content,
    })

    await tx.insert(questionTags).values(
      tagIds.map((tagId) => ({
        questionId: id,
        tagId,
      }))
    )
  })

  return getQuestionBySlug(slug)
}

export async function listQuestions(query: ListQuestionsQuery) {
  const offset = (query.page - 1) * query.limit

  const conditions = and(
    eq(questions.status, query.status),
    ...(query.isResolved !== undefined ? [eq(questions.isResolved, query.isResolved)] : []),
    ...(query.tag
      ? [
          exists(
            db
              .select({ id: questionTags.questionId })
              .from(questionTags)
              .innerJoin(tags, eq(questionTags.tagId, tags.id))
              .where(and(eq(questionTags.questionId, questions.id), eq(tags.slug, query.tag)))
          ),
        ]
      : [])
  )

  const answerStats = db
    .select({
      questionId: answers.questionId,
      answerCount: count().as('answer_count'),
      lastAnswerAt: max(answers.createdAt).as('last_answer_at'),
    })
    .from(answers)
    .groupBy(answers.questionId)
    .as('answer_stats')

  const ordering =
    query.sort === 'mostAnswered'
      ? [desc(answerStats.answerCount), desc(questions.createdAt), desc(questions.id)]
      : query.sort === 'recentActivity'
        ? [
            desc(sql`COALESCE(${answerStats.lastAnswerAt}, ${questions.createdAt})`),
            desc(questions.id),
          ]
        : [desc(questions.createdAt), desc(questions.id)]

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: questions.id,
        authorId: questions.authorId,
        title: questions.title,
        slug: questions.slug,
        content: questions.content,
        status: questions.status,
        isResolved: questions.isResolved,
        createdAt: questions.createdAt,
        updatedAt: questions.updatedAt,
        answerCount: answerStats.answerCount,
        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(questions)
      .leftJoin(answerStats, eq(answerStats.questionId, questions.id))
      .leftJoin(users, eq(questions.authorId, users.id))
      .where(conditions)
      .orderBy(...ordering)
      .limit(query.limit)
      .offset(offset),

    db.select({ total: count() }).from(questions).where(conditions),
  ])

  const tagsByQuestion = await getTagsByQuestionIds(items.map((item) => item.id))

  const total = Number(countResult[0]?.total ?? 0)

  return {
    items: items.map((item) => ({
      ...item,
      author: item.author?.id ? item.author : null,
      answerCount: Number(item.answerCount ?? 0),
      tags: tagsByQuestion.get(item.id) ?? [],
    })),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: Math.ceil(total / query.limit),
    },
  }
}

export async function getQuestionBySlug(slug: string) {
  const [result] = await db
    .select({
      question: questions,
      author: {
        id: users.id,
        username: users.username,
        avatarUrl: users.avatarUrl,
      },
    })
    .from(questions)
    .leftJoin(users, eq(questions.authorId, users.id))
    .where(eq(questions.slug, slug))
    .limit(1)

  if (!result) return null

  const { question, author } = result

  const tagsByQuestion = await getTagsByQuestionIds([question.id])

  return {
    ...question,
    author: author?.id ? author : null,
    tags: tagsByQuestion.get(question.id) ?? [],
  }
}

export async function updateQuestion(
  questionId: string,
  authorId: string,
  input: UpdateQuestionInput
) {
  const [existing] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.authorId, authorId)))
    .limit(1)

  if (!existing) return null

  if (input.tagIds !== undefined) {
    await validateTagIds([...new Set(input.tagIds)])

    if (new Set(input.tagIds).size !== input.tagIds.length) {
      throw new Error('DUPLICATE_TAG_IDS')
    }
  }

  await db.transaction(async (tx) => {
    const { tagIds, ...fields } = input

    if (Object.keys(fields).length > 0) {
      await tx
        .update(questions)
        .set({
          ...fields,
          updatedAt: new Date(),
        })
        .where(and(eq(questions.id, questionId), eq(questions.authorId, authorId)))
    }

    if (tagIds !== undefined) {
      await tx.delete(questionTags).where(eq(questionTags.questionId, questionId))

      await tx.insert(questionTags).values(
        [...new Set(tagIds)].map((tagId) => ({
          questionId,
          tagId,
        }))
      )
    }
  })

  const [updated] = await db
    .select({ slug: questions.slug })
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)

  return updated ? getQuestionBySlug(updated.slug) : null
}

export async function deleteQuestion(questionId: string, authorId: string): Promise<boolean> {
  const [existing] = await db
    .select({ id: questions.id })
    .from(questions)
    .where(and(eq(questions.id, questionId), eq(questions.authorId, authorId)))
    .limit(1)

  if (!existing) return false

  await db
    .delete(questions)
    .where(and(eq(questions.id, questionId), eq(questions.authorId, authorId)))

  return true
}

export async function setQuestionResolution(
  questionId: string,
  authorId: string,
  isResolved: boolean
) {
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1)

  if (!question) {
    return { status: 'QUESTION_NOT_FOUND' } as const
  }

  if (question.authorId !== authorId) {
    return { status: 'FORBIDDEN' } as const
  }

  await db.update(questions).set({ isResolved }).where(eq(questions.id, questionId))

  const [updatedQuestion] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)
  if (!updatedQuestion) {
    return { status: 'QUESTION_NOT_FOUND' } as const
  }

  return {
    status: 'UPDATED',
    question: updatedQuestion,
  } as const
}

export async function setQuestionStatus(
  questionId: string,
  authorId: string,
  status: 'OPEN' | 'CLOSED'
) {
  const [question] = await db.select().from(questions).where(eq(questions.id, questionId)).limit(1)

  if (!question) {
    return { status: 'QUESTION_NOT_FOUND' } as const
  }

  if (question.authorId !== authorId) {
    return { status: 'FORBIDDEN' } as const
  }

  await db.update(questions).set({ status }).where(eq(questions.id, questionId))

  const [updatedQuestion] = await db
    .select()
    .from(questions)
    .where(eq(questions.id, questionId))
    .limit(1)

  if (!updatedQuestion) {
    return { status: 'QUESTION_NOT_FOUND' } as const
  }

  return {
    status: 'UPDATED',
    question: updatedQuestion,
  } as const
}
