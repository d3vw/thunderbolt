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
import { Info, Search, Users } from 'lucide-react'
import { memo, useState } from 'react'

type AgnoTeamMember = {
  id: string
  name: string
  role?: string
}

type AgnoTeam = {
  id: string
  name: string
  description?: string
  mode?: string
  members?: AgnoTeamMember[]
}

const agnoUrl = import.meta.env.VITE_AGNO_URL ?? 'http://localhost:8000'

export default function TeamsPage() {
  const [debouncedSearchQuery, setDebouncedSearchQuery] = useState('')
  const [selectedTeamId, setSelectedTeamId] = useState<string | null>(null)

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['agno-teams'],
    queryFn: () => http.get(`${agnoUrl}/teams`).json<AgnoTeam[]>(),
  })

  const filteredTeams = debouncedSearchQuery
    ? teams.filter((t) => t.name.toLowerCase().includes(debouncedSearchQuery.toLowerCase()))
    : teams

  return (
    <div className="flex flex-col overflow-hidden">
      <div className="flex-1">
        <div className="flex flex-col gap-6 p-4 w-full max-w-[1200px] mx-auto">
          <PageSearch onSearch={setDebouncedSearchQuery}>
            <PageHeader title="Teams">
              <PageSearch.Button tooltip="Search" />
            </PageHeader>
            <PageSearch.Input placeholder="Search teams..." onSearch={setDebouncedSearchQuery} />
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
            ) : filteredTeams.length === 0 ? (
              debouncedSearchQuery ? (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Search className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No matching results</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    No teams found matching "{debouncedSearchQuery}".
                  </p>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center py-16 text-center">
                  <Users className="h-12 w-12 text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No teams available</h3>
                  <p className="text-muted-foreground mb-4 max-w-md">
                    Make sure your Agno server is running at{' '}
                    <code className="text-xs bg-muted px-1 py-0.5 rounded">{agnoUrl}</code>.
                  </p>
                </div>
              )
            ) : (
              <div className="flex flex-col gap-4">
                {filteredTeams.map((team) => (
                  <TeamCard key={team.id} team={team} onInfo={(t) => setSelectedTeamId(t.id)} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <TeamInfoSheet teamId={selectedTeamId} onClose={() => setSelectedTeamId(null)} />
    </div>
  )
}

const TeamCard = memo(({ team, onInfo }: { team: AgnoTeam; onInfo: (team: AgnoTeam) => void }) => {
  const memberCount = team.members?.length ?? 0

  return (
    <Card className="hover:bg-accent/30 transition-colors">
      <CardContent className="px-5 py-4">
        <div className="flex items-center gap-4">
          <NavLink to={`/teams/${team.id}`} className="flex-1 min-w-0">
            <h3 className="text-sm font-medium text-foreground truncate">{team.name}</h3>
            <p className="text-sm text-muted-foreground mt-0.5">
              {team.mode && <span className="capitalize">{team.mode}</span>}
              {team.mode && memberCount > 0 && ' · '}
              {memberCount > 0 && `${memberCount} ${memberCount === 1 ? 'member' : 'members'}`}
              {team.description && !team.mode && !memberCount && <span className="truncate">{team.description}</span>}
            </p>
          </NavLink>

          <div className="shrink-0">
            <ButtonGroup size="icon">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <ButtonGroupItem variant="outline" onClick={() => onInfo(team)}>
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

TeamCard.displayName = 'TeamCard'

const TeamInfoSheet = ({ teamId, onClose }: { teamId: string | null; onClose: () => void }) => {
  const { data: team, isLoading } = useQuery({
    queryKey: ['agno-team', teamId],
    queryFn: () => http.get(`${agnoUrl}/teams/${teamId}`).json<AgnoTeam>(),
    enabled: !!teamId,
  })

  return (
    <Sheet open={!!teamId} onOpenChange={(open) => !open && onClose()}>
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
        ) : team ? (
          <>
            <SheetHeader>
              <SheetTitle>{team.name}</SheetTitle>
            </SheetHeader>

            <div className="flex flex-col gap-8 mt-2 px-4 pb-8">
              {team.description && (
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Description</h4>
                  <p className="text-sm">{team.description}</p>
                </section>
              )}

              {team.mode && (
                <section className="flex flex-col gap-2">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Mode</h4>
                  <p className="text-sm capitalize">{team.mode}</p>
                </section>
              )}

              {team.members && team.members.length > 0 && (
                <section className="flex flex-col gap-3">
                  <h4 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                    Members ({team.members.length})
                  </h4>
                  <div className="flex flex-col gap-2">
                    {team.members.map((member) => (
                      <div key={member.id} className="flex flex-col gap-0.5">
                        <span className="text-sm font-medium">{member.name}</span>
                        {member.role && <span className="text-xs text-muted-foreground capitalize">{member.role}</span>}
                      </div>
                    ))}
                  </div>
                </section>
              )}
            </div>
          </>
        ) : null}
      </SheetContent>
    </Sheet>
  )
}
