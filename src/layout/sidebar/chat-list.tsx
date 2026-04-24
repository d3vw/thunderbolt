import { DeleteAllChatsDialog } from '@/components/delete-all-chats-dialog'
import { DeleteChatDialog } from '@/components/delete-chat-dialog'
import { SearchInput } from '@/components/ui/search-input'
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from '@/components/ui/sidebar'
import { Flame, Loader2, Search, Users } from 'lucide-react'
import { useNavigate, useLocation, useSearchParams } from 'react-router'
import { ChatActions } from './chat-actions'
import { ChatListItem } from './chat-list-item'
import type { ChatListProps } from './types'

export const ChatList = ({
  chatThreads,
  agnoTeamSessions,
  currentChatThreadId,
  isCollapsed,
  isMobile,
  debouncedSearchQuery,
  deleteAllChatsMutation,
  deleteChatMutation,
  deleteAllChatsDialogRef,
  deleteChatDialogRef,
  threadIdRef,
  searchQuery,
  showSearch,
  searchInputRef,
  onChatClick,
  onRename,
  onSearchClick,
  onSearchQueryChange,
}: ChatListProps) => {
  const navigate = useNavigate()
  const location = useLocation()
  const [searchParams] = useSearchParams()
  const activeSession = searchParams.get('session')

  return (
    <>
      <SidebarGroup className="flex-1 flex flex-col min-h-0">
        {!isCollapsed && (chatThreads.length > 0 || debouncedSearchQuery) && (
          <div className="flex items-center justify-between flex-shrink-0">
            <SidebarGroupLabel>Recent Chats</SidebarGroupLabel>
            <ChatActions
              isCollapsed={isCollapsed}
              debouncedSearchQuery={debouncedSearchQuery}
              deleteAllChatsMutation={deleteAllChatsMutation}
              deleteAllChatsDialogRef={deleteAllChatsDialogRef}
              onSearchClick={onSearchClick}
            />
          </div>
        )}
        <div
          className={`transition-all duration-300 ease-in-out flex-shrink-0 ${
            showSearch && !isCollapsed && (chatThreads.length > 0 || debouncedSearchQuery)
              ? 'max-h-12 opacity-100 mt-2'
              : 'max-h-0 opacity-0 overflow-hidden'
          }`}
        >
          <SearchInput
            ref={searchInputRef}
            containerClassName="mb-1"
            placeholder="Search chats..."
            value={searchQuery}
            onChange={(e) => onSearchQueryChange(e.target.value)}
          />
        </div>
        <SidebarMenu className="mt-2 group-data-[collapsible=icon]:mt-0 flex-1 min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide touch-pan-y">
          {isCollapsed && (chatThreads.length > 0 || debouncedSearchQuery) && (
            <>
              <SidebarMenuItem>
                <SidebarMenuButton onClick={(e) => onSearchClick(e)} tooltip="Search chats" className="cursor-pointer">
                  <Search
                    className={`size-[var(--icon-size-default)] ${debouncedSearchQuery ? 'text-blue-500' : ''}`}
                  />
                </SidebarMenuButton>
              </SidebarMenuItem>
              <SidebarMenuItem>
                <SidebarMenuButton
                  onClick={() => deleteAllChatsDialogRef.current?.open()}
                  disabled={deleteAllChatsMutation.isPending}
                  tooltip="Clear all chats"
                  className="cursor-pointer"
                >
                  {deleteAllChatsMutation.isPending ? (
                    <Loader2 className="size-[var(--icon-size-default)] animate-spin" />
                  ) : (
                    <Flame className="size-[var(--icon-size-default)]" />
                  )}
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
          {chatThreads.map((thread) => (
            <ChatListItem
              key={thread.id}
              thread={thread}
              isActive={thread.id === currentChatThreadId}
              isCollapsed={isCollapsed}
              isMobile={isMobile}
              deleteChatMutation={deleteChatMutation}
              threadIdRef={threadIdRef}
              deleteChatDialogRef={deleteChatDialogRef}
              onChatClick={onChatClick}
              onRename={onRename}
            />
          ))}
          {chatThreads.length === 0 && debouncedSearchQuery && !isCollapsed && (
            <div className="text-center text-sm py-12 px-4 text-muted-foreground">
              No matches for "{debouncedSearchQuery}"
            </div>
          )}

          {agnoTeamSessions.length > 0 && (
            <>
              {!isCollapsed && (chatThreads.length > 0 || debouncedSearchQuery) && (
                <div className="px-2 pt-4 pb-1 text-xs font-medium text-muted-foreground/60 uppercase tracking-wide">
                  Teams
                </div>
              )}
              {agnoTeamSessions.map((session) => {
                const isActive =
                  location.pathname === `/teams/${session.team_id}` && activeSession === session.session_id
                return (
                  <SidebarMenuItem key={session.session_id}>
                    <SidebarMenuButton
                      onClick={() => navigate(`/teams/${session.team_id}?session=${session.session_id}`)}
                      isActive={isActive}
                      tooltip={session.session_name || session.session_id}
                      className="cursor-pointer"
                    >
                      <Users className="size-[var(--icon-size-default)] shrink-0" />
                      {!isCollapsed && (
                        <span className="truncate flex-1 min-w-0">{session.session_name || session.session_id}</span>
                      )}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </>
          )}
        </SidebarMenu>
      </SidebarGroup>

      <DeleteAllChatsDialog onConfirm={() => deleteAllChatsMutation.mutate()} ref={deleteAllChatsDialogRef} />
      <DeleteChatDialog
        onCancel={() => {
          threadIdRef.current = null
        }}
        onConfirm={() => threadIdRef.current && deleteChatMutation.mutate({ id: threadIdRef.current })}
        ref={deleteChatDialogRef}
      />
    </>
  )
}
