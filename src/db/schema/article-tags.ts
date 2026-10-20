import { index, mysqlTable, primaryKey, timestamp, varchar } from 'drizzle-orm/mysql-core'

import { articles } from './articles.js'
import { tags } from './tags.js'

export const articleTags = mysqlTable(
  'article_tags',
  {
    articleId: varchar('article_id', { length: 36 })
      .notNull()
      .references(() => articles.id, { onDelete: 'cascade' }),

    tagId: varchar('tag_id', { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.articleId, table.tagId],
      name: 'article_tags_pk',
    }),

    index('article_tags_tag_id_idx').on(table.tagId),
  ]
)

export type ArticleTag = typeof articleTags.$inferSelect
export type NewArticleTag = typeof articleTags.$inferInsert
