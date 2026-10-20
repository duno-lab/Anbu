import { index, mysqlEnum, mysqlTable, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'

import { answers } from './answers.js'
import { users } from './users.js'

export const answerVoteValue = mysqlEnum('value', ['UP', 'DOWN'])

export const answerVotes = mysqlTable(
  'answer_votes',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    answerId: varchar('answer_id', { length: 36 })
      .notNull()
      .references(() => answers.id, { onDelete: 'cascade' }),

    userId: varchar('user_id', { length: 36 })
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),

    value: answerVoteValue.notNull(),
  },
  (table) => [
    uniqueIndex('answer_votes_answer_user_unique').on(table.answerId, table.userId),
    index('answer_votes_user_id_idx').on(table.userId),
  ]
)

export type AnswerVote = typeof answerVotes.$inferSelect
export type NewAnswerVote = typeof answerVotes.$inferInsert
