
import {
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const articleStatus = mysqlEnum('status', [
  'DRAFT',
  'PUBLISHED',
])

export const articles = mysqlTable(
  'articles',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 200 }).notNull(),

    slug: varchar('slug', { length: 220 }).notNull(),

    excerpt: varchar('excerpt', { length: 500 }),

    content: text('content').notNull(),

    status: articleStatus.notNull().default('DRAFT'),

    publishedAt: timestamp('published_at', {
      mode: 'date',
    }),

    createdAt: timestamp('created_at', {
      mode: 'date',
    })
      .notNull()
      .defaultNow(),

    updatedAt: timestamp('updated_at', {
      mode: 'date',
    })
      .notNull()
      .defaultNow()
      .onUpdateNow(),
  },
  (table) => [
    uniqueIndex('articles_slug_unique').on(table.slug),
    index('articles_author_id_idx').on(table.authorId),
    index('articles_status_published_at_idx').on(
      table.status,
      table.publishedAt,
    ),
  ],
)

export type Article = typeof articles.$inferSelect
export type NewArticle = typeof articles.$inferInsert
