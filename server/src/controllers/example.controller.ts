import type { Context } from 'koa'
import { db, examples } from '../db'

export const getExample = async (ctx: Context) => {
  try {
    const allExamples = await db.select().from(examples)
    ctx.body = { success: true, data: allExamples }
  } catch (error) {
    ctx.status = 500
    ctx.body = { success: false, error: 'Failed to fetch examples' }
  }
}

export const createExample = async (ctx: Context) => {
  try {
    const { name, description } = ctx.request.body as { name: string; description?: string }

    if (!name) {
      ctx.status = 400
      ctx.body = { success: false, error: 'Name is required' }
      return
    }

    const newExample = await db
      .insert(examples)
      .values({
        name,
        description: description || null,
      })
      .returning()

    ctx.status = 201
    ctx.body = { success: true, data: newExample[0] }
  } catch (error) {
    ctx.status = 500
    ctx.body = { success: false, error: 'Failed to create example' }
  }
}
