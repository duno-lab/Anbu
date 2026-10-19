import { mysqlTable, varchar, timestamp, index } from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const sessions = mysqlTable(
  'sessions',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    userId: varchar('user_id', {
      length: 36,
    })
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    refreshTokenHash: varchar('refresh_token_hash', {
      length: 255,
    }).notNull(),

    expiresAt: timestamp('expires_at').notNull(),

    revokedAt: timestamp('revoked_at'),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    userIndex: index('sessions_user_id_idx').on(table.userId),
  })
)
