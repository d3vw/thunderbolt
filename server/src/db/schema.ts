import { pgTable, serial, text, timestamp } from 'drizzle-orm/pg-core'

export const examples = pgTable('examples', {
  id: serial('id').primaryKey(),
  name: text('name').notNull(),
  description: text('description'),
  createdAt: timestamp('created_at').defaultNow().notNull(),
  updatedAt: timestamp('updated_at').defaultNow().notNull(),
})
