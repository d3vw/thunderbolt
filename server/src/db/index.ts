import { drizzle } from 'drizzle-orm/postgres-js'
import postgres from 'postgres'
import 'dotenv/config'

// Read database connection info from environment variables
const connectionString =
  process.env.DATABASE_URL ||
  `postgres://${process.env.DB_USER || 'postgres'}:${process.env.DB_PASSWORD || 'postgres'}@${process.env.DB_HOST || 'localhost'}:${process.env.DB_PORT || '5432'}/${
    process.env.DB_NAME || 'thunderbolt'
  }`

// Create the connection
const client = postgres(connectionString)

// Create the Drizzle ORM instance
export const db = drizzle(client)

export * from './schema'
