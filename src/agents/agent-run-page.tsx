import { Button } from '@/components/ui/button'
import { MemoizedMarkdown } from '@/components/chat/memoized-markdown'
import { http } from '@/lib/http'
import { cn } from '@/lib/utils'
import { useQuery } from '@tanstack/react-query'
import {
  AlertTriangle,
  ArrowLeft,
  CheckCircle2,
  ChevronDown,
  Loader2,
  SendHorizontal,
  Users,
  XCircle,
} from 'lucide-react'
import { useReducer, useRef, useEffect, useCallback, useState, type KeyboardEvent } from 'react'
import { useNavigate, useParams } from 'react-router'

type AgnoAgentModel = { name: string; model: string; provider: string }

type AgnoAgentTool = { name: string; description: string }

type AgnoAgent = {
  id: string
  name: string
  model: AgnoAgentModel
  tools: { tools: Array<AgnoAgentTool> }
}

// ── Structured content types ──────────────────────────────────────────────────

type ActionItem = {
  owner: string
  task: string
  priority: 'urgent' | 'normal' | string
  source_lines?: number[]
}

type DiscussionTopic = {
  title: string
  summary: string
}

type MeetingStructure = {
  title: string
  participants: string[]
  overview: string
  decisions: string[]
  bugs_and_issues: string[]
  action_items: ActionItem[]
  discussion_topics: DiscussionTopic[]
}

type StructuredContent = { type: 'MeetingStructure'; data: MeetingStructure }

type ToolCallStatus = 'running' | 'done' | 'error'

type ToolCall = {
  /** Unique key: tool_name + call index */
  key: string
  name: string
  status: ToolCallStatus
  /** Raw result string (JSON or plain text) from tool execution */
  result?: string
  /** Execution duration in seconds */
  duration?: number
}

type Message = {
  role: 'user' | 'assistant'
  content: string
  toolCalls?: ToolCall[]
  structuredContent?: StructuredContent
}

type State = {
  messages: Message[]
  input: string
  isStreaming: boolean
  sessionId: string
  followups: string[]
}

type Action =
  | { type: 'SET_INPUT'; input: string }
  | { type: 'SEND_MESSAGE'; text: string }
  | { type: 'APPEND_DELTA'; delta: string }
  | { type: 'TOOL_CALL_STARTED'; toolName: string }
  | { type: 'TOOL_CALL_COMPLETED'; toolName: string; result?: string; error?: boolean; duration?: number }
  | { type: 'SET_STRUCTURED_CONTENT'; structuredContent: StructuredContent }
  | { type: 'COMPLETE'; followups: string[]; content?: string; structuredContent?: StructuredContent }
  | { type: 'USE_FOLLOWUP'; text: string }

const agnoUrl = import.meta.env.VITE_AGNO_URL ?? 'http://localhost:8000'

const getSessionKey = (agentId: string) => `agno-session-${agentId}`

const updateLastAssistantMessage = (messages: Message[], updater: (msg: Message) => Message): Message[] => {
  const updated = [...messages]
  const lastIdx = updated.length - 1
  if (updated[lastIdx]?.role === 'assistant') {
    updated[lastIdx] = updater(updated[lastIdx])
  }
  return updated
}

const reducer = (state: State, action: Action): State => {
  switch (action.type) {
    case 'SET_INPUT':
      return { ...state, input: action.input }

    case 'SEND_MESSAGE':
      return {
        ...state,
        input: '',
        followups: [],
        isStreaming: true,
        messages: [
          ...state.messages,
          { role: 'user', content: action.text },
          { role: 'assistant', content: '', toolCalls: [] },
        ],
      }

    case 'APPEND_DELTA':
      return {
        ...state,
        messages: updateLastAssistantMessage(state.messages, (msg) => ({
          ...msg,
          content: msg.content + action.delta,
        })),
      }

    case 'TOOL_CALL_STARTED':
      return {
        ...state,
        messages: updateLastAssistantMessage(state.messages, (msg) => {
          const existing = msg.toolCalls ?? []
          const key = `${action.toolName}-${existing.filter((t) => t.name === action.toolName).length}`
          return {
            ...msg,
            toolCalls: [...existing, { key, name: action.toolName, status: 'running' }],
          }
        }),
      }

    case 'TOOL_CALL_COMPLETED':
      return {
        ...state,
        messages: updateLastAssistantMessage(state.messages, (msg) => {
          const toolCalls = (msg.toolCalls ?? []).map((tc) => {
            if (tc.name === action.toolName && tc.status === 'running') {
              return {
                ...tc,
                status: action.error ? ('error' as const) : ('done' as const),
                result: action.result,
                duration: action.duration,
              }
            }
            return tc
          })
          return { ...msg, toolCalls }
        }),
      }

    case 'SET_STRUCTURED_CONTENT':
      return {
        ...state,
        messages: updateLastAssistantMessage(state.messages, (msg) => ({
          ...msg,
          structuredContent: action.structuredContent,
        })),
      }

    case 'COMPLETE': {
      const messages = updateLastAssistantMessage(state.messages, (msg) => ({
        ...msg,
        content: !msg.content && action.content ? action.content : msg.content,
        structuredContent: msg.structuredContent ?? action.structuredContent,
      }))
      return { ...state, isStreaming: false, followups: action.followups, messages }
    }

    case 'USE_FOLLOWUP':
      return { ...state, input: action.text, followups: [] }

    default:
      return state
  }
}

const parseSessionId = (agentId: string): string => {
  const stored = localStorage.getItem(getSessionKey(agentId))
  if (stored) {
    return stored
  }
  const id = crypto.randomUUID()
  localStorage.setItem(getSessionKey(agentId), id)
  return id
}

const getSlashQuery = (value: string, cursorPos: number): string | null => {
  const textBeforeCursor = value.slice(0, cursorPos)
  const match = textBeforeCursor.match(/(?:^|\s)(\/\S*)$/)
  return match ? match[1] : null
}

export default function AgentRunPage() {
  const { agentId } = useParams<{ agentId: string }>()
  const navigate = useNavigate()
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const abortControllerRef = useRef<AbortController | null>(null)

  const [state, dispatch] = useReducer(reducer, undefined, () => ({
    messages: [],
    input: '',
    isStreaming: false,
    sessionId: parseSessionId(agentId!),
    followups: [],
  }))

  const [slashMenuIndex, setSlashMenuIndex] = useState(0)

  const { data: agent } = useQuery({
    queryKey: ['agno-agent', agentId],
    queryFn: () => http.get(`${agnoUrl}/agents/${agentId}`).json<AgnoAgent>(),
    enabled: !!agentId,
  })

  const allTools = agent?.tools?.tools ?? []

  const slashQuery = getSlashQuery(state.input, textareaRef.current?.selectionStart ?? state.input.length)
  const filteredTools =
    slashQuery !== null ? allTools.filter((t) => t.name.toLowerCase().includes(slashQuery.slice(1).toLowerCase())) : []
  const slashMenuOpen = filteredTools.length > 0

  useEffect(() => {
    setSlashMenuIndex(0)
  }, [slashQuery])
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [state.messages])

  const applyToolSuggestion = useCallback(
    (toolName: string) => {
      const textarea = textareaRef.current
      const cursorPos = textarea?.selectionStart ?? state.input.length
      const textBeforeCursor = state.input.slice(0, cursorPos)
      const textAfterCursor = state.input.slice(cursorPos)
      const newBefore = textBeforeCursor.replace(/(?:^|(?<=\s))(\/\S*)$/, `/${toolName} `)
      const newInput = newBefore + textAfterCursor
      dispatch({ type: 'SET_INPUT', input: newInput })
      requestAnimationFrame(() => {
        if (textarea) {
          textarea.focus()
          textarea.selectionStart = newBefore.length
          textarea.selectionEnd = newBefore.length
        }
      })
    },
    [state.input],
  )

  const sendMessage = useCallback(
    async (text: string) => {
      if (!text.trim() || state.isStreaming || !agentId) {
        return
      }

      dispatch({ type: 'SEND_MESSAGE', text })
      abortControllerRef.current = new AbortController()

      const body = new FormData()
      body.append('message', text)
      body.append('stream', 'true')
      body.append('session_id', state.sessionId)

      const response = await fetch(`${agnoUrl}/agents/${agentId}/runs`, {
        method: 'POST',
        body,
        signal: abortControllerRef.current.signal,
      })

      const reader = response.body?.getReader()
      if (!reader) {
        dispatch({ type: 'COMPLETE', followups: [] })
        return
      }

      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) {
          break
        }

        buffer += decoder.decode(value, { stream: true })
        const lines = buffer.split('\n')
        buffer = lines.pop() ?? ''

        for (const line of lines) {
          if (!line.startsWith('data: ')) {
            continue
          }
          const raw = line.slice(6).trim()
          if (!raw || raw === '[DONE]') {
            continue
          }

          let event: Record<string, unknown>
          try {
            event = JSON.parse(raw)
          } catch {
            continue
          }

          const eventType = event.event as string | undefined

          if (eventType === 'RunContent' && typeof event.content === 'string') {
            dispatch({ type: 'APPEND_DELTA', delta: event.content })
          } else if (
            eventType === 'RunContent' &&
            event.content_type === 'MeetingStructure' &&
            typeof event.content === 'object' &&
            event.content !== null
          ) {
            dispatch({
              type: 'SET_STRUCTURED_CONTENT',
              structuredContent: { type: 'MeetingStructure', data: event.content as MeetingStructure },
            })
          } else if (eventType === 'ToolCallStarted') {
            const tool = event.tool as Record<string, unknown> | undefined
            const toolName = typeof tool?.tool_name === 'string' ? tool.tool_name : 'unknown'
            dispatch({ type: 'TOOL_CALL_STARTED', toolName })
          } else if (eventType === 'ToolCallCompleted') {
            const tool = event.tool as Record<string, unknown> | undefined
            const toolName = typeof tool?.tool_name === 'string' ? tool.tool_name : 'unknown'
            const rawResult = tool?.result != null ? String(tool.result) : undefined
            const error = tool?.tool_call_error === true
            const metrics = tool?.metrics as Record<string, unknown> | undefined
            const duration = typeof metrics?.duration === 'number' ? metrics.duration : undefined
            dispatch({ type: 'TOOL_CALL_COMPLETED', toolName, result: rawResult, error, duration })
          } else if (eventType === 'RunCompleted') {
            const followups = Array.isArray(event.followups) ? (event.followups as string[]) : []
            if (typeof event.session_id === 'string') {
              localStorage.setItem(getSessionKey(agentId!), event.session_id)
            }
            const completedContent = typeof event.content === 'string' ? event.content : undefined
            const completedStructured: StructuredContent | undefined =
              event.content_type === 'MeetingStructure' && typeof event.content === 'object' && event.content !== null
                ? { type: 'MeetingStructure', data: event.content as MeetingStructure }
                : undefined
            dispatch({ type: 'COMPLETE', followups, content: completedContent, structuredContent: completedStructured })
            return
          }
        }
      }

      dispatch({ type: 'COMPLETE', followups: [] })
    },
    [agentId, state.isStreaming, state.sessionId],
  )

  const handleSubmit = () => sendMessage(state.input)

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (slashMenuOpen) {
      if (e.key === 'ArrowDown') {
        e.preventDefault()
        setSlashMenuIndex((i) => (i + 1) % filteredTools.length)
        return
      }
      if (e.key === 'ArrowUp') {
        e.preventDefault()
        setSlashMenuIndex((i) => (i - 1 + filteredTools.length) % filteredTools.length)
        return
      }
      if (e.key === 'Enter' || e.key === 'Tab') {
        e.preventDefault()
        applyToolSuggestion(filteredTools[slashMenuIndex].name)
        return
      }
      if (e.key === 'Escape') {
        dispatch({ type: 'SET_INPUT', input: state.input })
        return
      }
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit()
    }
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="flex items-center gap-3 px-4 py-3 border-b shrink-0">
        <Button variant="ghost" size="icon" onClick={() => navigate('/agents')} className="shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <div className="flex flex-col min-w-0">
          <span className="text-sm font-medium truncate">{agent?.name ?? agentId}</span>
          {agent && (
            <span className="text-xs text-muted-foreground">
              {agent.model.provider} · {agent.model.model}
            </span>
          )}
        </div>
      </div>

      {/* Messages */}
      <div className="flex-1 overflow-y-auto px-4 py-6">
        {state.messages.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            Send a message to start
          </div>
        ) : (
          <div className="flex flex-col gap-4 max-w-3xl mx-auto">
            {state.messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} isStreaming={state.isStreaming && i === state.messages.length - 1} />
            ))}
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Followups */}
      {state.followups.length > 0 && (
        <div className="px-4 pb-2 flex flex-wrap gap-2 max-w-3xl mx-auto w-full">
          {state.followups.map((f, i) => (
            <button
              key={i}
              onClick={() => dispatch({ type: 'USE_FOLLOWUP', text: f })}
              className="text-xs px-3 py-1.5 rounded-full border bg-background hover:bg-accent transition-colors text-left"
            >
              {f}
            </button>
          ))}
        </div>
      )}

      {/* Input */}
      <div className="px-4 pb-4 shrink-0">
        <div className="relative flex gap-2 max-w-3xl mx-auto">
          {slashMenuOpen && (
            <div className="absolute bottom-full mb-1 left-0 right-10 z-50 rounded-lg border bg-popover shadow-md overflow-hidden">
              {filteredTools.map((tool, i) => (
                <button
                  key={tool.name}
                  onMouseDown={(e) => {
                    e.preventDefault()
                    applyToolSuggestion(tool.name)
                  }}
                  className={`w-full flex items-baseline gap-2 px-3 py-2 text-left text-sm transition-colors ${
                    i === slashMenuIndex ? 'bg-accent text-accent-foreground' : 'hover:bg-accent/50'
                  }`}
                >
                  <code className="font-mono text-xs text-foreground shrink-0">/{tool.name}</code>
                  {tool.description && (
                    <span className="text-xs text-muted-foreground truncate">{tool.description}</span>
                  )}
                </button>
              ))}
            </div>
          )}

          <textarea
            ref={textareaRef}
            value={state.input}
            onChange={(e) => dispatch({ type: 'SET_INPUT', input: e.target.value })}
            onKeyDown={handleKeyDown}
            placeholder="Message... (type / for tools)"
            rows={1}
            disabled={state.isStreaming}
            className="flex-1 resize-none rounded-lg border bg-background px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-ring disabled:opacity-50 min-h-[40px] max-h-[160px] leading-relaxed"
            style={{ height: 'auto' }}
            onInput={(e) => {
              const el = e.currentTarget
              el.style.height = 'auto'
              el.style.height = `${el.scrollHeight}px`
            }}
          />
          <Button
            size="icon"
            onClick={handleSubmit}
            disabled={!state.input.trim() || state.isStreaming}
            className="shrink-0 self-end"
          >
            <SendHorizontal className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  )
}

// ── Tool call indicator ───────────────────────────────────────────────────────

/**
 * Attempt to parse and pretty-print a JSON string.
 * Returns the formatted string if parseable, otherwise returns the original.
 */
const formatToolResult = (raw: string): { isJson: boolean; formatted: string } => {
  try {
    const parsed = JSON.parse(raw)
    return { isJson: true, formatted: JSON.stringify(parsed, null, 2) }
  } catch {
    return { isJson: false, formatted: raw }
  }
}

const ToolCallIndicator = ({ toolCall }: { toolCall: ToolCall }) => {
  const [expanded, setExpanded] = useState(false)
  const hasResult = !!toolCall.result
  const panelId = `tool-result-${toolCall.key}`

  const durationLabel =
    toolCall.duration != null
      ? toolCall.duration < 1
        ? `${Math.round(toolCall.duration * 1000)}ms`
        : `${toolCall.duration.toFixed(2)}s`
      : null

  return (
    <div
      className={cn(
        'rounded-md border text-xs font-mono overflow-hidden transition-colors',
        toolCall.status === 'running' && 'border-border bg-muted/40',
        toolCall.status === 'done' && 'border-green-500/30 bg-green-500/5',
        toolCall.status === 'error' && 'border-destructive/30 bg-destructive/5',
      )}
    >
      <button
        type="button"
        aria-expanded={hasResult ? expanded : undefined}
        aria-controls={hasResult ? panelId : undefined}
        className={cn(
          'w-full flex items-center gap-2 px-3 py-1.5 text-left',
          hasResult ? 'cursor-pointer hover:bg-black/5 dark:hover:bg-white/5' : 'cursor-default',
        )}
        onClick={() => hasResult && setExpanded((v) => !v)}
        disabled={!hasResult}
      >
        {toolCall.status === 'running' && (
          <Loader2 aria-hidden="true" className="h-3 w-3 shrink-0 animate-spin text-muted-foreground" />
        )}
        {toolCall.status === 'done' && <CheckCircle2 aria-hidden="true" className="h-3 w-3 shrink-0 text-green-500" />}
        {toolCall.status === 'error' && <XCircle aria-hidden="true" className="h-3 w-3 shrink-0 text-destructive" />}

        <span
          className={cn(
            'flex-1 truncate',
            toolCall.status === 'running' && 'text-muted-foreground',
            toolCall.status === 'done' && 'text-green-700 dark:text-green-400',
            toolCall.status === 'error' && 'text-destructive',
          )}
        >
          {toolCall.name}()
        </span>

        {durationLabel && (
          <span className="text-muted-foreground/60 shrink-0 font-sans tabular-nums">{durationLabel}</span>
        )}

        {hasResult && (
          <ChevronDown
            aria-hidden="true"
            className={cn(
              'h-3 w-3 shrink-0 text-muted-foreground transition-transform duration-200',
              expanded && 'rotate-180',
            )}
          />
        )}
      </button>

      {hasResult && (
        <div
          id={panelId}
          role="region"
          aria-label={`Result of ${toolCall.name}`}
          hidden={!expanded}
          className="border-t border-border/50"
        >
          <ToolResultContent result={toolCall.result!} />
        </div>
      )}
    </div>
  )
}

const ToolResultContent = ({ result }: { result: string }) => {
  const { isJson, formatted } = formatToolResult(result)

  return (
    <div className="px-3 py-2">
      {isJson ? (
        <JsonResultView json={formatted} />
      ) : (
        <pre className="text-[11px] text-muted-foreground whitespace-pre-wrap break-words max-h-48 overflow-y-auto leading-relaxed font-mono">
          {formatted}
        </pre>
      )}
    </div>
  )
}

/** Renders JSON with key/value coloring for improved readability. */
const JsonResultView = ({ json }: { json: string }) => {
  const lines = json.split('\n')

  return (
    <pre className="text-[11px] max-h-64 overflow-y-auto leading-relaxed font-mono" aria-label="JSON result">
      {lines.map((line, i) => {
        // Match: optional whitespace, quoted key, colon, then value
        const kvMatch = line.match(/^(\s*)("(?:[^"\\]|\\.)*")(\s*:\s*)(.+)$/)
        if (kvMatch) {
          const [, indent, key, colon, value] = kvMatch
          const valueClass = getJsonValueClass(value.trimEnd())
          return (
            <span key={i} className="block">
              <span>{indent}</span>
              <span className="text-sky-600 dark:text-sky-400">{key}</span>
              <span className="text-muted-foreground">{colon}</span>
              <span className={valueClass}>{value}</span>
            </span>
          )
        }
        return (
          <span key={i} className="block text-muted-foreground">
            {line}
          </span>
        )
      })}
    </pre>
  )
}

const getJsonValueClass = (value: string): string => {
  const trimmed = value.replace(/[,}[\]]*$/, '').trim()
  if (trimmed === 'null') {
    return 'text-muted-foreground/70'
  }
  if (trimmed === 'true' || trimmed === 'false') {
    return 'text-amber-600 dark:text-amber-400'
  }
  if (/^-?\d/.test(trimmed)) {
    return 'text-violet-600 dark:text-violet-400'
  }
  if (trimmed.startsWith('"')) {
    return 'text-emerald-700 dark:text-emerald-400'
  }
  return 'text-muted-foreground'
}

// ── Meeting structure view ────────────────────────────────────────────────────

const MeetingStructureView = ({ data }: { data: MeetingStructure }) => {
  const urgentItems = data.action_items.filter((a) => a.priority === 'urgent')
  const normalItems = data.action_items.filter((a) => a.priority !== 'urgent')

  // Group normal action items by owner for readability
  const byOwner = normalItems.reduce<Record<string, ActionItem[]>>((acc, item) => {
    acc[item.owner] = [...(acc[item.owner] ?? []), item]
    return acc
  }, {})

  return (
    <article aria-label={data.title} className="flex flex-col gap-6 text-sm text-foreground">
      {/* Header */}
      <header className="flex flex-col gap-2">
        <h2 className="text-base font-semibold leading-snug">{data.title}</h2>
        {data.participants.length > 0 && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground flex-wrap">
            <Users aria-hidden="true" className="size-[var(--icon-size-sm)] shrink-0" />
            <span className="sr-only">Participants:</span>
            {data.participants.join(' · ')}
          </div>
        )}
      </header>

      {/* Overview */}
      <section aria-labelledby="meeting-overview-label">
        <p
          id="meeting-overview-label"
          className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-1.5"
        >
          概述
        </p>
        <p className="leading-relaxed text-foreground/90">{data.overview}</p>
      </section>

      {/* Urgent action items surfaced at top */}
      {urgentItems.length > 0 && (
        <section aria-labelledby="urgent-actions-label">
          <p
            id="urgent-actions-label"
            className="text-xs font-medium uppercase tracking-wide text-destructive mb-2 flex items-center gap-1.5"
          >
            <AlertTriangle aria-hidden="true" className="size-[var(--icon-size-sm)]" />
            紧急待办
          </p>
          <ul className="flex flex-col gap-1.5" role="list">
            {urgentItems.map((item, i) => (
              <li
                key={i}
                className="flex gap-2.5 items-start rounded-md border border-destructive/30 bg-destructive/5 px-3 py-2"
              >
                <span className="shrink-0 font-medium text-destructive min-w-[4rem]">{item.owner}</span>
                <span className="text-foreground/90 leading-relaxed">{item.task}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Decisions */}
      {data.decisions.length > 0 && (
        <section aria-labelledby="decisions-label">
          <p id="decisions-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            决策
          </p>
          <ul className="flex flex-col gap-1 pl-4" role="list" style={{ listStyleType: 'disc' }}>
            {data.decisions.map((d, i) => (
              <li key={i} className="leading-relaxed text-foreground/90">
                {d}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Bugs & issues */}
      {data.bugs_and_issues.length > 0 && (
        <section aria-labelledby="bugs-label">
          <p id="bugs-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            问题 &amp; 缺陷
          </p>
          <ul className="flex flex-col gap-1 pl-4" role="list" style={{ listStyleType: 'disc' }}>
            {data.bugs_and_issues.map((b, i) => (
              <li key={i} className="leading-relaxed text-foreground/80">
                {b}
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* Action items by owner */}
      {Object.keys(byOwner).length > 0 && (
        <section aria-labelledby="action-items-label">
          <p id="action-items-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            待办事项
          </p>
          <div className="flex flex-col gap-3">
            {Object.entries(byOwner).map(([owner, items]) => (
              <div key={owner}>
                <p className="text-xs font-semibold text-foreground mb-1">{owner}</p>
                <ul className="flex flex-col gap-1" role="list">
                  {items.map((item, i) => (
                    <li key={i} className="flex gap-2 items-start pl-3 border-l-2 border-border">
                      <span className="leading-relaxed text-foreground/80">{item.task}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Discussion topics */}
      {data.discussion_topics.length > 0 && (
        <section aria-labelledby="topics-label">
          <p id="topics-label" className="text-xs font-medium uppercase tracking-wide text-muted-foreground mb-2">
            议题摘要
          </p>
          <div className="flex flex-col gap-2">
            {data.discussion_topics.map((topic, i) => (
              <details key={i} className="rounded-md border border-border group">
                <summary className="flex items-center justify-between gap-2 px-3 py-2 cursor-pointer select-none list-none hover:bg-muted/40 transition-colors rounded-md group-open:rounded-b-none group-open:border-b group-open:border-border">
                  <span className="font-medium text-sm">{topic.title}</span>
                  <ChevronDown
                    aria-hidden="true"
                    className="size-[var(--icon-size-sm)] shrink-0 text-muted-foreground transition-transform group-open:rotate-180"
                  />
                </summary>
                <div className="px-3 py-2.5 text-sm text-foreground/80 leading-relaxed">{topic.summary}</div>
              </details>
            ))}
          </div>
        </section>
      )}
    </article>
  )
}

// ── Message bubble ────────────────────────────────────────────────────────────

const tryParseJson = (content: string): unknown | null => {
  try {
    return JSON.parse(content)
  } catch {
    return null
  }
}

const AssistantContent = ({ content }: { content: string }) => {
  const json = tryParseJson(content)
  if (json !== null) {
    return (
      <pre className="text-xs font-mono whitespace-pre-wrap break-words overflow-x-auto">
        {JSON.stringify(json, null, 2)}
      </pre>
    )
  }
  return <MemoizedMarkdown content={content} id={`msg-${content.length}`} />
}

const MessageBubble = ({ message, isStreaming }: { message: Message; isStreaming: boolean }) => {
  const isUser = message.role === 'user'
  const toolCalls = message.toolCalls ?? []

  if (isUser) {
    return (
      <div className="flex justify-end">
        <div className="max-w-[80%] rounded-2xl rounded-br-sm px-4 py-2.5 text-sm leading-relaxed bg-primary text-primary-foreground whitespace-pre-wrap">
          {message.content}
        </div>
      </div>
    )
  }

  // Structured content: render full-width, no bubble
  if (message.structuredContent) {
    return (
      <div className="flex flex-col gap-2 w-full">
        {toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {toolCalls.map((tc) => (
              <ToolCallIndicator key={tc.key} toolCall={tc} />
            ))}
          </div>
        )}
        <div className="rounded-xl border border-border bg-card px-5 py-4 w-full">
          {message.structuredContent.type === 'MeetingStructure' && (
            <MeetingStructureView data={message.structuredContent.data} />
          )}
        </div>
      </div>
    )
  }

  return (
    <div className="flex justify-start">
      <div className="max-w-[80%] flex flex-col gap-2">
        {/* Tool call indicators */}
        {toolCalls.length > 0 && (
          <div className="flex flex-col gap-1.5">
            {toolCalls.map((tc) => (
              <ToolCallIndicator key={tc.key} toolCall={tc} />
            ))}
          </div>
        )}

        {/* Text response */}
        {(message.content || isStreaming) && (
          <div className="rounded-2xl rounded-bl-sm px-4 py-2.5 text-sm leading-relaxed bg-muted text-foreground">
            {message.content ? (
              <AssistantContent content={message.content} />
            ) : (
              <span className="inline-flex gap-1 items-center">
                <span className="animate-bounce [animation-delay:0ms] w-1 h-1 bg-current rounded-full inline-block" />
                <span className="animate-bounce [animation-delay:150ms] w-1 h-1 bg-current rounded-full inline-block" />
                <span className="animate-bounce [animation-delay:300ms] w-1 h-1 bg-current rounded-full inline-block" />
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  )
}
