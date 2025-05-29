import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { useDrizzle } from '@/db/provider'
import { mcpServersTable } from '@/db/tables'
import { useMcpSync } from '@/hooks/use-mcp-sync'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { eq } from 'drizzle-orm'
import { Check, Plus, X } from 'lucide-react'
import { useState } from 'react'
import { v7 as uuidv7 } from 'uuid'

interface McpServer {
  id: string
  name: string
  url: string
  enabled: number
  createdAt: number | null
  updatedAt: number | null
}

export default function McpServersPage() {
  const { db } = useDrizzle()
  const queryClient = useQueryClient()
  const { servers: mcpServers } = useMcpSync()
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [newServerUrl, setNewServerUrl] = useState('')
  const [isTestingConnection, setIsTestingConnection] = useState(false)
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle')
  const [serverCapabilities, setServerCapabilities] = useState<string[]>([])

  const { data: servers = [] } = useQuery({
    queryKey: ['mcp-servers'],
    queryFn: async (): Promise<McpServer[]> => {
      return await db.select().from(mcpServersTable)
    },
  })

  const toggleServerMutation = useMutation({
    mutationFn: async ({ id, enabled }: { id: string; enabled: boolean }) => {
      await db
        .update(mcpServersTable)
        .set({ enabled: enabled ? 1 : 0, updatedAt: Math.floor(Date.now() / 1000) })
        .where(eq(mcpServersTable.id, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
  })

  const addServerMutation = useMutation({
    mutationFn: async ({ name, url }: { name: string; url: string }) => {
      await db.insert(mcpServersTable).values({
        id: uuidv7(),
        name,
        url,
        enabled: 1,
      })
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
      setIsAddDialogOpen(false)
      setNewServerUrl('')
      setConnectionStatus('idle')
      setServerCapabilities([])
    },
  })

  const deleteServerMutation = useMutation({
    mutationFn: async (id: string) => {
      await db.delete(mcpServersTable).where(eq(mcpServersTable.id, id))
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['mcp-servers'] })
    },
  })

  const testConnection = async () => {
    if (!newServerUrl) return

    setIsTestingConnection(true)
    setConnectionStatus('idle')
    setServerCapabilities([])

    try {
      console.log('Testing connection to:', newServerUrl)

      // Import the MCP SDK components
      const { StreamableHTTPClientTransport } = await import('@modelcontextprotocol/sdk/client/streamableHttp.js')
      const { experimental_createMCPClient } = await import('ai')

      // Create a real MCP client using the same method as the provider
      console.log('Creating MCP client...')
      const mcpClient = await experimental_createMCPClient({
        transport: new StreamableHTTPClientTransport(new URL(newServerUrl), {
          requestInit: {
            headers: {
              Accept: 'application/json, text/event-stream',
            },
          },
        }),
      })

      console.log('MCP client created successfully')

      // Try to get tools to verify the connection works
      console.log('Requesting tools...')
      const tools = await mcpClient.tools()

      console.log('Tools response:', tools)
      setConnectionStatus('success')

      // Extract tool names for display
      if (tools && typeof tools === 'object') {
        const toolNames = Object.keys(tools)
        setServerCapabilities(toolNames.length > 0 ? toolNames : ['Connection successful - no tools available'])
      } else {
        setServerCapabilities(['Connection successful - no tools listed'])
      }

      // Close the connection
      console.log('Closing MCP client connection...')
      if (mcpClient.close) {
        try {
          mcpClient.close()
        } catch (closeError) {
          console.warn('Error closing MCP client:', closeError)
        }
      }
    } catch (error) {
      console.error('Connection test error:', error)
      setConnectionStatus('error')
    } finally {
      setIsTestingConnection(false)
    }
  }

  const handleAddServer = () => {
    if (!newServerUrl) return

    // Extract server name from URL
    const url = new URL(newServerUrl)
    const name = `${url.hostname}${url.port ? `:${url.port}` : ''} MCP Server`

    addServerMutation.mutate({ name, url: newServerUrl })
  }

  const getConnectionStatus = (server: McpServer) => {
    // Get real connection status from MCP provider
    const mcpServer = mcpServers.find((s) => s.id === server.id)
    if (mcpServer) {
      return mcpServer.isConnected ? 'connected' : 'disconnected'
    }
    return server.enabled ? 'connecting' : 'disconnected'
  }

  return (
    <div className="flex flex-col gap-4 p-4 w-full max-w-[760px] mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-4xl font-bold tracking-tight mb-2 text-primary">MCP Servers</h1>
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogTrigger asChild>
            <Button variant="outline" size="icon">
              <Plus />
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>Add MCP Server</DialogTitle>
              <DialogDescription>Enter the URL of the MCP server you want to connect to.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid gap-2">
                <Label htmlFor="url">Server URL</Label>
                <Input id="url" placeholder="http://localhost:8000/mcp/" value={newServerUrl} onChange={(e) => setNewServerUrl(e.target.value)} />
              </div>

              {newServerUrl && (
                <Button onClick={testConnection} disabled={isTestingConnection} variant="outline">
                  {isTestingConnection ? 'Testing...' : 'Test Connection'}
                </Button>
              )}

              {connectionStatus === 'success' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-md">
                  <div className="flex items-center gap-2 text-green-800">
                    <Check className="size-4" />
                    <span className="font-medium">Connection successful!</span>
                  </div>
                  {serverCapabilities.length > 0 && (
                    <div className="mt-2">
                      <p className="text-sm text-green-700">Available tools:</p>
                      <ul className="text-sm text-green-600 mt-1">
                        {serverCapabilities.map((capability, index) => (
                          <li key={index}>• {capability}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              )}

              {connectionStatus === 'error' && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-md">
                  <div className="flex items-center gap-2 text-red-800">
                    <X className="size-4" />
                    <span className="font-medium">Connection failed</span>
                  </div>
                  <p className="text-sm text-red-600 mt-1">Could not connect to the MCP server. Please check the URL and try again.</p>
                </div>
              )}
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleAddServer} disabled={!newServerUrl || connectionStatus !== 'success'}>
                Add Server
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {servers.map((server) => {
          const status = getConnectionStatus(server)
          return (
            <Card key={server.id} className="relative">
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className={`size-3 rounded-full ${status === 'connected' ? 'bg-green-500' : status === 'connecting' ? 'bg-yellow-500' : 'bg-red-500'}`} />
                    <div>
                      <CardTitle className="text-lg">{server.name}</CardTitle>
                      <CardDescription className="text-sm">{server.url}</CardDescription>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Switch checked={server.enabled === 1} onCheckedChange={(checked) => toggleServerMutation.mutate({ id: server.id, enabled: checked })} />
                    <Button variant="ghost" size="sm" onClick={() => deleteServerMutation.mutate(server.id)} className="text-red-600 hover:text-red-700 hover:bg-red-50">
                      <X className="size-4" />
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <span>Status:</span>
                  <span className={status === 'connected' ? 'text-green-600' : status === 'connecting' ? 'text-yellow-600' : 'text-red-600'}>
                    {status === 'connected' ? 'Connected' : status === 'connecting' ? 'Connecting...' : 'Disconnected'}
                  </span>
                </div>
              </CardContent>
            </Card>
          )
        })}

        {servers.length === 0 && (
          <Card className="p-8 text-center">
            <CardContent>
              <p className="text-muted-foreground">No MCP servers configured.</p>
              <p className="text-sm text-muted-foreground mt-1">Click the + button to add your first server.</p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
