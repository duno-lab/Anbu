import { and, count, desc, eq, exists, isNotNull, like, lt, or, sql } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { articles } from '../../db/schema/articles.js'
import { articleTags } from '../../db/schema/article-tags.js'
import { questions } from '../../db/schema/questions.js'
import { questionTags } from '../../db/schema/question-tags.js'
import { tags } from '../../db/schema/tags.js'

import type { SearchQuery } from './search.schema.js'

function createPagination(page: number, limit: number, total: number) {
  return {
    page,
    limit,
    total,
    totalPages: Math.ceil(total / limit),
  }
}

export async function searchContent(query: SearchQuery) {
  const { q, page, limit, type } = query
  const offset = (page - 1) * limit
  const pattern = `%${q}%`
  const now = new Date()

  const articleTagMatch = exists(
    db
      .select({ id: articleTags.articleId })
      .from(articleTags)
      .innerJoin(tags, eq(articleTags.tagId, tags.id))
      .where(
        and(
          eq(articleTags.articleId, articles.id),
          or(like(tags.name, pattern), like(tags.slug, pattern))
        )
      )
  )

  const questionTagMatch = exists(
    db
      .select({ id: questionTags.questionId })
      .from(questionTags)
      .innerJoin(tags, eq(questionTags.tagId, tags.id))
      .where(
        and(
          eq(questionTags.questionId, questions.id),
          or(like(tags.name, pattern), like(tags.slug, pattern))
        )
      )
  )

  const articleConditions = and(
    eq(articles.status, 'PUBLISHED'),
    isNotNull(articles.publishedAt),
    lt(articles.publishedAt, now),
    or(
      like(articles.title, pattern),
      like(articles.excerpt, pattern),
      like(articles.content, pattern),
      articleTagMatch
    )
  )

  const questionConditions = or(
    like(questions.title, pattern),
    like(questions.content, pattern),
    questionTagMatch
  )

  const [articleItems, articleCount, questionItems, questionCount] = await Promise.all([
    type === 'questions'
      ? Promise.resolve([])
      : db
          .select({
            id: articles.id,
            type: sql<'article'>`'article'`,
            title: articles.title,
            slug: articles.slug,
            excerpt: articles.excerpt,
            publishedAt: articles.publishedAt,
          })
          .from(articles)
          .where(articleConditions)
          .orderBy(
            sql`CASE WHEN ${articles.title} LIKE ${pattern} THEN 0 ELSE 1 END`,
            desc(articles.publishedAt)
          )
          .limit(limit)
          .offset(offset),

    type === 'questions'
      ? Promise.resolve([{ total: 0 }])
      : db.select({ total: count() }).from(articles).where(articleConditions),

    type === 'articles'
      ? Promise.resolve([])
      : db
          .select({
            id: questions.id,
            type: sql<'question'>`'question'`,
            title: questions.title,
            slug: questions.slug,
            content: questions.content,
            status: questions.status,
            isResolved: questions.isResolved,
            createdAt: questions.createdAt,
            updatedAt: questions.updatedAt,
          })
          .from(questions)
          .where(questionConditions)
          .orderBy(
            sql`CASE WHEN ${questions.title} LIKE ${pattern} THEN 0 ELSE 1 END`,
            desc(questions.updatedAt)
          )
          .limit(limit)
          .offset(offset),

    type === 'articles'
      ? Promise.resolve([{ total: 0 }])
      : db.select({ total: count() }).from(questions).where(questionConditions),
  ])

  const totalArticles = Number(articleCount[0]?.total ?? 0)
  const totalQuestions = Number(questionCount[0]?.total ?? 0)

  return {
    query: q,
    results: {
      articles: {
        items: articleItems,
        pagination: createPagination(page, limit, totalArticles),
      },
      questions: {
        items: questionItems,
        pagination: createPagination(page, limit, totalQuestions),
      },
    },
    totals: {
      articles: totalArticles,
      questions: totalQuestions,
      all: totalArticles + totalQuestions,
    },
  }
}
