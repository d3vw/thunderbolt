import { NavLink } from '@/components/ui/nav-link'
import { Card, CardContent } from '@/components/ui/card'
import { PageHeader } from '@/components/ui/page-header'
import { PageSearch } from '@/components/ui/page-search'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip'
import { ButtonGroup, ButtonGroupItem } from '@/components/ui/button-group'
import { http } from '@/lib/http'
import { useQuery } from '@tanstack/react-query'
import { Bot, Info, Search } from 'lucide-react'
import { memo, useState } from 'react'

type AgnoAgentModel = { name: string; model: string; provider: string }

type AgnoAgentTool = {
  name: string
  description: string
  parameters?: { properties?: Record<string, { type: string }>; required?: string[] }
}

type AgnoAgent = {
  id: string
  name: string
  model: AgnoAgentModel
  tools: { tools: Array<AgnoAgentTool> }
  system_message?: { instructions?: string[] }
}

const agnoUrl = import.meta.env.VITE_AGNO_URL ?? 'http://localhost:8000'

export default function AgentsPage() {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedAgentId, setSelectedAgentId] = useState<string | null>(null)

  const { data: agents = [], isLoading } = useQuery({
    queryKey: ['agno-agents'],
    queryFn: () => http.get(`${agnoUrl}/agents`).json<AgnoAgent[]>(),
  })

  const filteredAgents = debouncedSearchQuery
    ? agents.filter((a) => a.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    : agents

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex-1">
        <div className="flex flex-col gap-6 p-4 w-full max-w-[1200px] mx-auto">
          <PageSearch onSearch={setDebouncedSearchQuery}>
            <PageHeader title="Agents">
              <PageSearch.Button tooltip="Search" />
            </PageHeader>
            <PageSearch.Input placeholder="Search agents..." onSearch={setDebouncedSearchQuery} />
          </PageSearch>

          <div className="flex-1">
            {isLoading ? (
              <div className="flex flex-col gap-4">
                {Array.from({ length: 6 }).map((_, i) => (
                  <Card key={i}>
                    <CardContent className="px-5 py-4">
                      <div className="flex items-center gap-4">
                        <div className="flex-1 min-w-0">
                          <Skeleton className="h-4 w-1/3 mb-1.5" />
                          <Skeleton className="h-3.5 w-2/3" />
                        </div>
                        <Skeleton className="h-8 w-8 rounded-lg shrink-0" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : filteredAgents.length === 0 ? (
              debouncedSearchQuery ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matching results</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    No agents found matching "{debouncedSearchQuery}".
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Bot className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No agents available</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Make sure your Agno server is running at{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{agnoUrl}</code>.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4">
                {filteredAgents.map((agent) => (
                  <AgentCard key={agent.id} agent={agent} onInfo={(a) => setSelectedAgentId(a.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <AgentInfoSheet agentId={selectedAgentId} onClose={() => setSelectedAgentId(null)} />
    </div>
  )
}

const AgentCard = memo(({ agent, onInfo }: { agent: AgnoAgent; onInfo: (agent: AgnoAgent) => void }) => {
  const toolCount = agent.tools?.tools?.length ?? 0

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-4">
          <NavLink to={`/agents/${agent.id}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">{agent.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {agent.model.provider} · {agent.model.model} · {toolCount} {toolCount === 1 ? 'tool' : 'tools'}
            </p>
          </NavLink>

          <div className="shrink-0">
            <ButtonGroup size="icon">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ButtonGroupItem variant="outline" onClick={() => onInfo(agent)}>
                      <Info className="h-3 w-3" />
                    </ButtonGroupItem>
                  </TooltipTrigger>
                  <TooltipContent>View Details</TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </ButtonGroup>
          </div>
        </div>
      </CardContent>
    </Card>
  )
})

AgentCard.displayName = 'AgentCard'

const AgentInfoSheet = ({ agentId, onClose }: { agentId: string | null; onClose: () => void }) => {
  const { data: agent, isLoading } = useQuery({
    queryKey: ['agno-agent', agentId],
    queryFn: () => http.get(`${agnoUrl}/agents/${agentId}`).json<AgnoAgent>(),
    enabled: !!agentId,
  })

  return (
    <Sheet open={!!agentId} onOpenChange={(open) => !open && onClose()}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        {isLoading ? (
          <div className="flex flex-col gap-6 p-4">
            <Skeleton className="h-5 w-1/2" />
            <div className="flex flex-col gap-2">
              <Skeleton className="h-3 w-16" />
              <Skeleton className="h-4 w-2/3" />
            </div>
            <div className="flex flex-col gap-3">
              <Skeleton className="h-3 w-12" />
              {Array.from({ length: 4 }).map((_, i) => (
                <Skeleton key={i} className="h-4 w-full" />
              ))}
            </div>
          </div>
        ) : agent ? (
          <>
            <SheetHeader>
              <SheetTitle>{agent.name}</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-8 mt-2 px-4 pb-8">
              {/* Model */}
              <section className="flex flex-col gap-2">
                <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Model</h4>
                <p className="text-sm">
                  {agent.model.provider} · {agent.model.model}
                </p>
              </section>

              {/* Tools */}
              {agent.tools?.tools?.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Tools ({agent.tools.tools.length})
                  </h4>
                  <div className="flex flex-col gap-3">
                    {agent.tools.tools.map((tool) => {
                      const params = tool.parameters?.properties ?? {}
                      const required = new Set(tool.parameters?.required ?? [])
                      const paramEntries = Object.entries(params)
                      return (
                        <div key={tool.name} className="flex flex-col gap-1">
                          <code className="text-xs font-mono text-foreground">{tool.name}</code>
                          {tool.description && (
                            <span className="text-xs text-muted-foreground leading-relaxed">{tool.description}</span>
                          )}
                          {paramEntries.length > 0 && (
                            <div className="flex flex-wrap gap-1 mt-0.5">
                              {paramEntries.map(([param, schema]) => (
                                <span
                                  key={param}
                                  className="text-xs bg-muted px-1.5 py-0.5 rounded font-mono text-muted-foreground"
                                >
                                  {param}
                                  <span className="text-muted-foreground/50">:{schema.type}</span>
                                  {required.has(param) && <span className="text-destructive ml-0.5">*</span>}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </section>
              )}

              {/* Instructions */}
              {agent.system_message?.instructions && agent.system_message.instructions.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Instructions</h4>
                  <ul className="flex flex-col gap-2 text-sm text-muted-foreground">
                    {agent.system_message.instructions.map((instruction, i) => (
                      <li key={i} className="flex gap-2 leading-relaxed">
                        <span className="shrink-0 text-muted-foreground/50 select-none">{i + 1}.</span>
                        <span>{instruction}</span>
                      </li>
                    ))}
                  </ul>
                </section>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
