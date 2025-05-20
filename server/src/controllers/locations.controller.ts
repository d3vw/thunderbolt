import type { Context } from 'koa'
import axios from 'axios'

// Mapbox API endpoint for geocoding (place search)
const MAPBOX_API_URL = 'https://api.mapbox.com/geocoding/v5/mapbox.places'
const MAPBOX_ACCESS_TOKEN = process.env.MAPBOX_ACCESS_TOKEN

/**
 * Search for locations/cities based on a query string
 */
export const searchLocations = async (ctx: Context) => {
  try {
    const { search } = ctx.query

    if (!search || typeof search !== 'string') {
      ctx.status = 400
      ctx.body = { success: false, error: 'Search query parameter is required' }
      return
    }

    if (!MAPBOX_ACCESS_TOKEN) {
      ctx.status = 500
      ctx.body = { success: false, error: 'Mapbox access token not configured' }
      return
    }

    // Make request to Mapbox API with types parameter set to 'place' to get only cities
    const response = await axios.get(`${MAPBOX_API_URL}/${encodeURIComponent(search)}.json`, {
      params: {
        access_token: MAPBOX_ACCESS_TOKEN,
        types: 'place', // Mapbox specific - 'place' refers to cities
        limit: 10, // Return a maximum of 10 results
        autocomplete: true,
      },
    })

    // Format the response data to include only relevant information
    const locations = response.data.features.map((feature: any) => ({
      name: feature.place_name,
      city: feature.text,
      coordinates: {
        lat: feature.center[1], // Mapbox returns coordinates as [lng, lat]
        lng: feature.center[0],
      },
    }))

    ctx.body = { success: true, data: locations }
  } catch (error) {
    console.error('Error searching locations:', error)
    ctx.status = 500
    ctx.body = { success: false, error: 'Failed to search locations' }
  }
}
