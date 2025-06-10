/**
 * Test Flower AI direct integration
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock the database and settings
vi.mock('@/db/singleton', () => ({
  getDrizzleDatabase: vi.fn(() => ({
    db: {
      select: vi.fn(() => ({
        from: vi.fn(() => ({
          where: vi.fn(() => ({
            get: vi.fn(() => ({ value: 'http://localhost:8000' }))
          }))
        }))
      }))
    }
  }))
}))

// Mock fetch
global.fetch = vi.fn()

describe('Flower Direct Integration', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('should get Flower API key from backend', async () => {
    const mockApiKey = 'test_api_key_123'
    
    // Mock successful API key response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_key: mockApiKey }),
      statusText: 'OK'
    } as Response)

    // Import after mocks are set up
    const { getFlowerApiKey } = await import('@/lib/flower-direct')
    
    const apiKey = await getFlowerApiKey()
    
    expect(apiKey).toBe(mockApiKey)
    expect(fetch).toHaveBeenCalledWith('http://localhost:8000/flower/api-key', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
    })
  })

  it('should handle API key fetch error', async () => {
    // Mock failed API key response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: false,
      statusText: 'Internal Server Error'
    } as Response)

    const { getFlowerApiKey } = await import('@/lib/flower-direct')
    
    const apiKey = await getFlowerApiKey()
    
    expect(apiKey).toBeUndefined()
  })

  it('should initialize Flower Intelligence with proxy URL', async () => {
    const mockApiKey = 'test_api_key_123'
    
    // Mock successful API key response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_key: mockApiKey }),
      statusText: 'OK'
    } as Response)

    // Mock Flower Intelligence module
    const mockFlowerInstance = {
      remoteHandoff: false,
      baseUrl: '',
      apiKey: '',
      chat: vi.fn()
    }

    vi.mock('../../flower/intelligence/ts/src', () => ({
      FlowerIntelligence: {
        instance: mockFlowerInstance
      }
    }))

    const { initializeFlowerIntelligence } = await import('@/lib/flower-direct')
    
    const fi = await initializeFlowerIntelligence()
    
    expect(mockFlowerInstance.remoteHandoff).toBe(true)
    expect(mockFlowerInstance.baseUrl).toBe('http://localhost:8000/flower')
    expect(mockFlowerInstance.apiKey).toBe(mockApiKey)
  })

  it('should handle chat request with direct Flower integration', async () => {
    const mockApiKey = 'test_api_key_123'
    const mockResponse = {
      ok: true,
      message: {
        role: 'assistant',
        content: 'Hello! How can I help you?'
      }
    }
    
    // Mock successful API key response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_key: mockApiKey }),
      statusText: 'OK'
    } as Response)

    // Mock Flower Intelligence module
    const mockFlowerInstance = {
      remoteHandoff: false,
      baseUrl: '',
      apiKey: '',
      chat: vi.fn().mockResolvedValue(mockResponse)
    }

    vi.mock('../../flower/intelligence/ts/src', () => ({
      FlowerIntelligence: {
        instance: mockFlowerInstance
      }
    }))

    const { chatWithFlowerDirect } = await import('@/lib/flower-direct')
    
    const messages = [{ role: 'user', content: 'Hello' }]
    const response = await chatWithFlowerDirect(messages, {
      model: 'test-model',
      encrypt: true,
      stream: false
    })
    
    expect(response).toEqual(mockResponse)
    expect(mockFlowerInstance.chat).toHaveBeenCalledWith({
      messages: [{ role: 'user', content: 'Hello' }],
      model: 'test-model',
      stream: false,
      encrypt: true,
      forceRemote: true,
      onStreamEvent: undefined
    })
  })

  it('should handle chat errors properly', async () => {
    const mockApiKey = 'test_api_key_123'
    const mockError = {
      ok: false,
      failure: {
        code: 'AUTH_ERROR',
        description: 'Authentication failed'
      }
    }
    
    // Mock successful API key response
    vi.mocked(global.fetch).mockResolvedValueOnce({
      ok: true,
      json: async () => ({ api_key: mockApiKey }),
      statusText: 'OK'
    } as Response)

    // Mock Flower Intelligence module
    const mockFlowerInstance = {
      remoteHandoff: false,
      baseUrl: '',
      apiKey: '',
      chat: vi.fn().mockResolvedValue(mockError)
    }

    vi.mock('../../flower/intelligence/ts/src', () => ({
      FlowerIntelligence: {
        instance: mockFlowerInstance
      }
    }))

    const { chatWithFlowerDirect } = await import('@/lib/flower-direct')
    
    const messages = [{ role: 'user', content: 'Hello' }]
    const response = await chatWithFlowerDirect(messages)
    
    expect(response).toEqual(mockError)
    expect(response.ok).toBe(false)
    expect(response.failure?.description).toBe('Authentication failed')
  })
})