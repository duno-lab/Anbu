import { mysqlTable, varchar, timestamp } from 'drizzle-orm/mysql-core'

export const users = mysqlTable('users', {
  id: varchar('id', { length: 36 }).primaryKey(),

  username: varchar('username', {
    length: 50,
  })
    .notNull()
    .unique(),

  email: varchar('email', {
    length: 255,
  }).unique(),

  avatarUrl: varchar('avatar_url', {
    length: 500,
  }),

  createdAt: timestamp('created_at').defaultNow().notNull(),

  updatedAt: timestamp('updated_at').defaultNow().onUpdateNow().notNull(),
})
