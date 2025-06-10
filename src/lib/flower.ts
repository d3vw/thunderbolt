/// <reference types="@flwr/flwr" />

import { getDrizzleDatabase } from '@/db/singleton'
import { settingsTable } from '@/db/tables'
import { eq } from 'drizzle-orm'

// Flower Intelligence module URL - using latest version
const FI_URL = 'https://unpkg.com/@flwr/flwr@latest/dist/flowerintelligence.bundled.es.js'

// Default model for Flower AI
const FI_DEFAULT_MODEL = 'llama-3.1-70b-instruct'

let cachedFlowerModule: Promise<{ FlowerIntelligence: any }> | null = null

function getFlowerIntelligenceModule() {
  if (!cachedFlowerModule) {
    cachedFlowerModule = import(FI_URL)
  }
  return cachedFlowerModule
}

export async function getFlowerApiKey(): Promise<string | undefined> {
  try {
    const { db } = await getDrizzleDatabase()
    const cloudUrlSetting = await db.select().from(settingsTable).where(eq(settingsTable.key, 'cloud_url')).get()
    const cloudUrl = (cloudUrlSetting?.value as string) || 'http://localhost:8000'

    const response = await fetch(`${cloudUrl}/flower/api-key`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })

    if (!response.ok) {
      throw new Error(`Failed to get Flower API key: ${response.statusText}`)
    }

    const data = await response.json()
    return data.api_key
  } catch (error) {
    console.error('Error getting Flower API key:', error)
    return undefined
  }
}

export async function initializeFlowerIntelligence(): Promise<any> {
  try {
    const { FlowerIntelligence } = await getFlowerIntelligenceModule()
    const fi = FlowerIntelligence.instance

    // Set up remote handoff
    fi.remoteHandoff = true

    // Get API key
    const apiKey = await getFlowerApiKey()
    if (!apiKey) {
      throw new Error('Failed to get Flower API key')
    }

    fi.apiKey = apiKey

    return fi
  } catch (error) {
    console.error('Error initializing Flower Intelligence:', error)
    throw error
  }
}

export async function chatWithFlower(
  messages: Array<{ role: string; content: string }>,
  options: {
    model?: string
    stream?: boolean
    encrypt?: boolean
    onStreamEvent?: (event: { chunk: string }) => void
  } = {}
): Promise<any> {
  const fi = await initializeFlowerIntelligence()

  const response = await fi.chat({
    model: options.model || FI_DEFAULT_MODEL,
    messages,
    stream: options.stream || false,
    encrypt: options.encrypt || true,
    forceRemote: true,
    onStreamEvent: options.onStreamEvent,
  })

  if (!response.ok) {
    throw new Error(response.failure?.description || 'Flower AI request failed')
  }

  return response
}

export { FI_DEFAULT_MODEL }
