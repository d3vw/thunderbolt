import type { Context, Next } from 'koa'

export const errorMiddleware = async (ctx: Context, next: Next) => {
  try {
    await next()
  } catch (err) {
    const error = err as Error
    ctx.status = ctx.status >= 400 && ctx.status < 600 ? ctx.status : 500
    ctx.body = {
      success: false,
      error: error.message || 'Internal Server Error',
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
    }

    // Log error
    console.error('Error processing request:', {
      path: ctx.path,
      method: ctx.method,
      error: error.message,
      stack: error.stack,
    })
  }
}
