import { randomUUID } from 'node:crypto'
import {
  and,
  count,
  desc,
  eq,
  isNotNull,
  lt,
} from 'drizzle-orm'

import { db } from '../../db/index.js'
import { articles } from '../../db/schema/articles.js'

import type {
  CreateArticleInput,
  UpdateArticleInput,
  ListArticlesQuery,
} from './articles.schema.js'

function createSlugBase(title: string): string {
  return (
    title
      .normalize('NFKD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-|-$/g, '')
      .slice(0, 180) || 'article'
  )
}

async function generateUniqueSlug(title: string): Promise<string> {
  const base = createSlugBase(title)

  for (let attempt = 0; attempt < 5; attempt++) {
    const slug = attempt === 0 ? base : `${base}-${randomUUID().slice(0, 8)}`

    const [existing] = await db
      .select({ id: articles.id })
      .from(articles)
      .where(eq(articles.slug, slug))
      .limit(1)

    if (!existing) {
      return slug
    }
  }

  throw new Error('Unable to generate a unique article slug')
}

export async function createArticle(authorId: string, input: CreateArticleInput) {
  const now = new Date()
  const slug = await generateUniqueSlug(input.title)

  await db.insert(articles).values({
    id: randomUUID(),
    authorId,
    title: input.title,
    slug,
    excerpt: input.excerpt ?? null,
    content: input.content,
    status: 'DRAFT',
    createdAt: now,
    updatedAt: now,
  })

  const [article] = await db.select().from(articles).where(eq(articles.slug, slug)).limit(1)

  if (!article) {
    throw new Error('Article was created but could not be retrieved')
  }

  return article
}


export async function listPublishedArticles(
  query: ListArticlesQuery,
) {
  const offset = (query.page - 1) * query.limit

  const conditions = and(
    eq(articles.status, 'PUBLISHED'),
    isNotNull(articles.publishedAt),
    lt(articles.publishedAt, new Date()),
  )

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: articles.id,
        authorId: articles.authorId,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        status: articles.status,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,
      })
      .from(articles)
      .where(conditions)
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(query.limit)
      .offset(offset),

    db
      .select({ total: count() })
      .from(articles)
      .where(conditions),
  ])

  const total = countResult[0]?.total ?? 0

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

export async function getPublishedArticleBySlug(slug: string) {
  const [article] = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.slug, slug),
        eq(articles.status, 'PUBLISHED'),
        isNotNull(articles.publishedAt)
      )
    )
    .limit(1)

  return article ?? null
}

export async function updateArticle(
  articleId: string,
  authorId: string,
  input: UpdateArticleInput
) {
  const [existing] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))
    .limit(1)

  if (!existing) {
    return null
  }

  await db
    .update(articles)
    .set({
      ...input,
      updatedAt: new Date(),
    })
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))

  const [updated] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1)

  return updated ?? null
}

export async function publishArticle(
  articleId: string,
  authorId: string,
) {
  const [existing] = await db
    .select()
    .from(articles)
    .where(
      and(
        eq(articles.id, articleId),
        eq(articles.authorId, authorId),
      ),
    )
    .limit(1)

  if (!existing) {
    return null
  }

  // Keep the original publication date when republishing.
  const publishedAt = existing.publishedAt ?? new Date()

  await db
    .update(articles)
    .set({
      status: 'PUBLISHED',
      publishedAt,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(articles.id, articleId),
        eq(articles.authorId, authorId),
      ),
    )

  const [updated] = await db
    .select()
    .from(articles)
    .where(eq(articles.id, articleId))
    .limit(1)

  return updated ?? null
}

export async function deleteArticle(
  articleId: string,
  authorId: string,
): Promise<boolean> {
  const [result] = await db
    .delete(articles)
    .where(
      and(
        eq(articles.id, articleId),
        eq(articles.authorId, authorId),
      ),
    )

  return result.affectedRows > 0
}
