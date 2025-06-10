import { Model, SaveMessagesFunction } from '@/types'
import { UIMessage } from 'ai'
import { chatWithFlowerDirect, getFlowerApiKey } from './flower-direct'

export const flowerFetchStreamingResponse = async ({
  init,
  saveMessages,
  model: modelConfig,
  chatId,
}: {
  init: RequestInit
  saveMessages: SaveMessagesFunction
  model: Model
  chatId: string
}) => {
  try {
    const options = init as RequestInit & { body: string }
    const body = JSON.parse(options.body)
    const { messages } = body as { messages: UIMessage[] }

    // Debug: Check what messages we're receiving
    console.log('Flower fetch received messages:', messages.map(m => ({ role: m.role, hasContent: !!m.parts?.length })))
    
    // Save messages like the regular AI fetch does
    await saveMessages({
      id: chatId,
      messages,
    })

    // Initialize Flower API key
    const apiKey = await getFlowerApiKey()
    if (!apiKey) {
      throw new Error('Failed to get Flower API key')
    }

    // Convert UI messages to Flower format
    const flowerMessages = messages.map((msg) => {
      // Extract content from parts
      let content = ''
      
      if (msg.parts && msg.parts.length > 0) {
        content = msg.parts
          .filter((part) => part.type === 'text')
          .map((part) => (part as any).text)
          .join(' ')
      }
      
      return {
        role: msg.role,
        content: content,
      }
    })

    // Create a custom response that mimics the streaming format expected by the UI
    return new Response(
      new ReadableStream({
        async start(controller) {
          try {
            let fullResponse = ''
            
            // Call Flower SDK with streaming
            // Try with encryption first, fall back to non-encrypted if it fails
            try {
              await chatWithFlowerDirect(flowerMessages, {
                model: modelConfig.model,
                stream: true,
                encrypt: true, // Try to encrypt for confidential models
                onStreamEvent: (event) => {
                  if (event.chunk) {
                    fullResponse += event.chunk
                    
                    // Format as SSE data event
                    controller.enqueue(
                      new TextEncoder().encode(
                        `data: ${JSON.stringify({ type: 'text', text: event.chunk })}\n\n`
                      )
                    )
                  }
                },
              })
            } catch (encryptError: any) {
              // If encryption fails (error 50003), retry without encryption
              if (encryptError.message?.includes('50003') || encryptError.code === 50003) {
                console.warn('Encryption failed with error 50003, retrying without encryption')
                fullResponse = '' // Reset response
                
                await chatWithFlowerDirect(flowerMessages, {
                  model: modelConfig.model,
                  stream: true,
                  encrypt: false,
                  onStreamEvent: (event) => {
                    if (event.chunk) {
                      fullResponse += event.chunk
                      
                      // Format as SSE data event
                      controller.enqueue(
                        new TextEncoder().encode(
                          `data: ${JSON.stringify({ type: 'text', text: event.chunk })}\n\n`
                        )
                      )
                    }
                  },
                })
              } else {
                throw encryptError
              }
            }

            // Send finish event in SSE format
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'finish', finishReason: 'stop' })}\n\n`
              )
            )
            
            // Send final DONE event
            controller.enqueue(
              new TextEncoder().encode('data: [DONE]\n\n')
            )
            
            controller.close()
          } catch (error) {
            console.error('Error in Flower streaming:', error)
            
            // Send error in SSE format
            controller.enqueue(
              new TextEncoder().encode(
                `data: ${JSON.stringify({ type: 'error', error: error instanceof Error ? error.message : 'Unknown error' })}\n\n`
              )
            )
            
            controller.close()
          }
        },
      }),
      {
        headers: {
          'Content-Type': 'text/event-stream',
          'Cache-Control': 'no-cache',
          'Connection': 'keep-alive',
          'X-Accel-Buffering': 'no',
        },
      }
    )
  } catch (error) {
    console.error('Error in flowerFetchStreamingResponse:', error)
    throw error
  }
}