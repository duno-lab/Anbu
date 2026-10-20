import { index, mysqlTable, text, timestamp, varchar } from 'drizzle-orm/mysql-core'

import { users } from './users.js'
import { questions } from './questions.js'

export const answers = mysqlTable(
  'answers',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    questionId: varchar('question_id', { length: 36 })
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),

    authorId: varchar('author_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    content: text('content').notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),

    updatedAt: timestamp('updated_at', { mode: 'date' }).notNull().defaultNow().onUpdateNow(),
  },
  (table) => [
    index('answers_question_id_idx').on(table.questionId),
    index('answers_author_id_idx').on(table.authorId),
    index('answers_question_created_at_idx').on(table.questionId, table.createdAt),
  ]
)

export type Answer = typeof answers.$inferSelect
export type NewAnswer = typeof answers.$inferInsert
