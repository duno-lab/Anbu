import { randomUUID } from 'node:crypto'
import { and, eq, inArray, asc } from 'drizzle-orm'

import { db } from '../../db/index.js'
import { articles } from '../../db/schema/articles.js'
import { articleTags } from '../../db/schema/article-tags.js'
import { tags } from '../../db/schema/tags.js'

import type { CreateTagInput } from './tags.schema.js'

function createSlugBase(name: string): string {
  return name
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 60)
}

async function generateUniqueSlug(name: string): Promise<string> {
  const base = createSlugBase(name) || 'tag'
  let slug = base
  let suffix = 1

  while (true) {
    const [existing] = await db
      .select({ id: tags.id })
      .from(tags)
      .where(eq(tags.slug, slug))
      .limit(1)

    if (!existing) return slug

    suffix += 1
    slug = `${base.slice(0, 60)}-${suffix}`
  }
}

export async function createTag(input: CreateTagInput) {
  const [existing] = await db
    .select({ id: tags.id })
    .from(tags)
    .where(eq(tags.name, input.name))
    .limit(1)

  if (existing) {
    throw new Error('TAG_ALREADY_EXISTS')
  }

  const slug = await generateUniqueSlug(input.name)

  await db.insert(tags).values({
    id: randomUUID(),
    name: input.name,
    slug,
  })

  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1)

  if (!tag) {
    throw new Error('TAG_CREATION_FAILED')
  }

  return tag
}

export async function listTags() {
  return db.select().from(tags).orderBy(asc(tags.name))
}

export async function getTagBySlug(slug: string) {
  const [tag] = await db.select().from(tags).where(eq(tags.slug, slug)).limit(1)

  return tag ?? null
}

export async function setArticleTags(articleId: string, authorId: string, tagIds: string[]) {
  const [article] = await db
    .select({ id: articles.id })
    .from(articles)
    .where(and(eq(articles.id, articleId), eq(articles.authorId, authorId)))
    .limit(1)

  if (!article) {
    return null
  }

  const uniqueTagIds = [...new Set(tagIds)]

  if (uniqueTagIds.length > 0) {
    const existingTags = await db
      .select({ id: tags.id })
      .from(tags)
      .where(inArray(tags.id, uniqueTagIds))

    if (existingTags.length !== uniqueTagIds.length) {
      throw new Error('TAG_NOT_FOUND')
    }
  }

  await db.transaction(async (tx) => {
    await tx.delete(articleTags).where(eq(articleTags.articleId, articleId))

    if (uniqueTagIds.length > 0) {
      await tx.insert(articleTags).values(
        uniqueTagIds.map((tagId) => ({
          articleId,
          tagId,
        }))
      )
    }
  })

  return db
    .select({
      id: tags.id,
      name: tags.name,
      slug: tags.slug,
    })
    .from(articleTags)
    .innerJoin(tags, eq(articleTags.tagId, tags.id))
    .where(eq(articleTags.articleId, articleId))
    .orderBy(asc(tags.name))
}
