import { index, mysqlTable, primaryKey, timestamp, varchar } from 'drizzle-orm/mysql-core'

import { questions } from './questions.js'
import { tags } from './tags.js'

export const questionTags = mysqlTable(
  'question_tags',
  {
    questionId: varchar('question_id', { length: 36 })
      .notNull()
      .references(() => questions.id, { onDelete: 'cascade' }),

    tagId: varchar('tag_id', { length: 36 })
      .notNull()
      .references(() => tags.id, { onDelete: 'cascade' }),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    primaryKey({
      columns: [table.questionId, table.tagId],
      name: 'question_tags_pk',
    }),

    index('question_tags_tag_id_idx').on(table.tagId),
  ]
)

export type QuestionTag = typeof questionTags.$inferSelect
export type NewQuestionTag = typeof questionTags.$inferInsert
