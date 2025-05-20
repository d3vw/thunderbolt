import Koa from 'koa'
import bodyParser from 'koa-bodyparser'
import 'dotenv/config'
import router from './routes'
import { errorMiddleware } from './middlewares/error.middleware'

// Initialize app
const app = new Koa()
const PORT = process.env.PORT || 3001

// Register middlewares
app.use(errorMiddleware)
app.use(bodyParser())

// Register routes
app.use(router.routes())
app.use(router.allowedMethods())

// Start server
app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`)
  console.log(`Healthcheck available at http://localhost:${PORT}/healthcheck`)
  console.log(`Example API available at http://localhost:${PORT}/example`)
})
