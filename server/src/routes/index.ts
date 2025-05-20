import Router from '@koa/router'
import { healthCheck } from '../controllers/healthcheck.controller'
import { getExample, createExample } from '../controllers/example.controller'
import { searchLocations } from '../controllers/locations.controller'

const router = new Router()

// Healthcheck route
router.get('/healthcheck', healthCheck)

// Example routes
router.get('/example', getExample)
router.post('/example', createExample)

// Locations route
router.get('/locations', searchLocations)

export default router
