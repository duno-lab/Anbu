import { index, mysqlTable, timestamp, uniqueIndex, varchar } from 'drizzle-orm/mysql-core'

export const tags = mysqlTable(
  'tags',
  {
    id: varchar('id', { length: 36 }).primaryKey(),

    name: varchar('name', { length: 50 }).notNull(),

    slug: varchar('slug', { length: 70 }).notNull(),

    createdAt: timestamp('created_at', { mode: 'date' }).notNull().defaultNow(),
  },
  (table) => [
    uniqueIndex('tags_name_unique').on(table.name),
    uniqueIndex('tags_slug_unique').on(table.slug),
    index('tags_created_at_idx').on(table.createdAt),
  ]
)

export type Tag = typeof tags.$inferSelect
export type NewTag = typeof tags.$inferInsert
