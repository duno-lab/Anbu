import { randomUUID } from 'node:crypto'
import { and, count, desc, eq, isNotNull, lt, exists, asc, inArray } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { articles, users } from '../../db/schema/index.js'
import type {
  CreateArticleInput,
  UpdateArticleInput,
  ListArticlesQuery,
} from './articles.schema.js'

import { articleTags } from '../../db/schema/article-tags.js'
import { tags } from '../../db/schema/tags.js'

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

async function getTagsByArticleIds(articleIds: string[]) {
  const result = new Map<string, Array<{ id: string; name: string; slug: string }>>()

  if (articleIds.length === 0) {
    return result
  }

  const rows = await db
    .select({
      articleId: articleTags.articleId,
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(inArray(articleTags.articleId, articleIds))
    .orderBy(asc(tags.name))

  for (const row of rows) {
    const articleTagList = result.get(row.articleId) ?? []

    articleTagList.push({
      id: row.id,
      name: row.name,
      slug: row.slug,
    })

    result.set(row.articleId, articleTagList)
  }

  return result
}

export async function listPublishedArticles(query: ListArticlesQuery) {
  const offset = (query.page - 1) * query.limit
  const now = new Date()

  const publishedConditions = and(
    eq(articles.status, 'PUBLISHED'),
    isNotNull(articles.publishedAt),
    lt(articles.publishedAt, now)
  )!

  const conditions = query.tag
    ? and(
        publishedConditions,
        exists(
          db
            .select({ id: articleTags.articleId })
            .from(articleTags)
            .innerJoin(tags, eq(articleTags.tagId, tags.id))
            .where(and(eq(articleTags.articleId, articles.id), eq(tags.slug, query.tag)))
        )
      )!
    : publishedConditions

  const [items, countResult] = await Promise.all([
    db
      .select({
        id: articles.id,
        authorId: articles.authorId,
        title: articles.title,
        slug: articles.slug,
        excerpt: articles.excerpt,
        content: articles.content,
        status: articles.status,
        publishedAt: articles.publishedAt,
        createdAt: articles.createdAt,

        author: {
          id: users.id,
          username: users.username,
          avatarUrl: users.avatarUrl,
        },
      })
      .from(articles)
      .innerJoin(users, eq(articles.authorId, users.id))
      .where(conditions)
      .orderBy(desc(articles.publishedAt), desc(articles.id))
      .limit(query.limit)
      .offset(offset),

    db.select({ total: count() }).from(articles).where(conditions),
  ])

  const tagsByArticle = await getTagsByArticleIds(items.map((article) => article.id))

  const total = countResult[0]?.total ?? 0

return {
  items: items.map(({ content, ...article }) => {
    const normalizedContent = content.trim().replace(/\s+/g, ' ')
    const excerpt =
      article.excerpt?.trim() ||
      (normalizedContent.length > 220
        ? `${normalizedContent.slice(0, 220).trimEnd()}…`
        : normalizedContent)

    return {
      ...article,
      excerpt,
      tags: tagsByArticle.get(article.id) ?? [],
    }
  }),
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
        isNotNull(articles.publishedAt),
        lt(articles.publishedAt, new Date())
      )
    )
    .limit(1)

  if (!article) {
    return null
  }

  const tagsByArticle = await getTagsByArticleIds([article.id])

  return {
    ...article,
    tags: tagsByArticle.get(article.id) ?? [],
  }
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

export async function publishArticle(articleId: string, authorId: string) {
  const [existing] = await db
    .select()
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))
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
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))

  const [updated] = await db.select().from(articles).where(eq(articles.id, articleId)).limit(1)

  return updated ?? null
}

export async function deleteArticle(articleId: string, authorId: string): Promise<boolean> {
  const [result] = await db
    .delete(articles)
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))

  return result.affectedRows > 0
}
