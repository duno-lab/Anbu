import { mysqlTable, varchar, timestamp, mysqlEnum, uniqueIndex } from 'drizzle-orm/mysql-core'

import { users } from './users.js'

export const authProvider = mysqlEnum('auth_provider', ['GOOGLE', 'FACEBOOK'])

export const authAccounts = mysqlTable(
  'auth_accounts',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    userId: varchar('user_id', {
      length: 36,
    })
      .notNull()
      .references(() => users.id, {
        onDelete: 'cascade',
      }),

    provider: authProvider.notNull(),

    providerUserId: varchar('provider_user_id', {
      length: 255,
    }).notNull(),

    createdAt: timestamp('created_at').defaultNow().notNull(),
  },
  (table) => ({
    providerUserUnique: uniqueIndex('auth_accounts_provider_user_unique').on(
      table.provider,
      table.providerUserId
    ),
  })
)
