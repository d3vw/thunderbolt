import type { Context } from 'koa'
import { db } from '../db'
import { sql } from 'drizzle-orm'

export const healthCheck = async (ctx: Context) => {
  try {
    // Test database connection by executing a simple query
    await db.execute(sql`SELECT 1`)

    ctx.body = {
      status: 'healthy',
      timestamp: new Date().toISOString(),
      database: 'connected',
      uptime: process.uptime(),
    }
  } catch (error) {
    ctx.status = 500
    ctx.body = {
      status: 'unhealthy',
      timestamp: new Date().toISOString(),
      database: 'disconnected',
      error: error instanceof Error ? error.message : 'Unknown error',
    }
  }
}
