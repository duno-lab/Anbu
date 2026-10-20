import {
  boolean,
  index,
  mysqlEnum,
  mysqlTable,
  text,
  timestamp,
  uniqueIndex,
  varchar,
} from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const questionStatus = mysqlEnum('status', ['OPEN', 'CLOSED'])

export const questions = mysqlTable(
  'questions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    title: varchar('title', { length: 200 }).notNull(),
    slug: varchar('slug', { length: 220 }).notNull(),
    content: text('content').notNull(),

    status: questionStatus.notNull().default('OPEN'),

    // Indicates whether the author considers the discussion resolved.
    isResolved: boolean('is_resolved').notNull().default(false),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    uniqueIndex('questions_slug_unique').on(table.slug),
    index('questions_author_id_idx').on(table.authorId),
    index('questions_status_created_at_idx').on(table.status, table.createdAt),
  ]
)

export type Question = typeof questions.$inferSelect
export type NewQuestion = typeof questions.$inferInsert
