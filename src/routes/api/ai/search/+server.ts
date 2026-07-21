import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { runNaturalMailSearch } from '$lib/server/natural-mail-search'
import { isOpenAIConfigured } from '$lib/server/openai'
import { logServerError } from '$lib/server/perf'
import type { MailListRow } from '$lib/server/mail'
import { isDemoModeEnabled, searchDemoMessages } from '$lib/server/demo'

const MAX_QUERY_CHARS = 500
const SEARCH_COOLDOWN_MS = 1_000
const activeSearches = new Set<string>()
const lastSearchAt = new Map<string, number>()

function serializeMessage(message: MailListRow) {
  return {
    id: message.id,
    messageId: message.messageId,
    uid: message.uid,
    subject: message.subject,
    from: message.from,
    to: message.to,
    preview: message.preview,
    flags: JSON.parse(message.flags) as string[],
    receivedAt: message.receivedAt?.toISOString() ?? null,
    snoozedUntil: message.snoozedUntil?.toISOString() ?? null,
    threadId: message.threadId ?? null,
    threadStarred: message.threadStarred ?? false,
    threadPinned: message.threadPinned ?? false,
    important: message.important ?? false,
    hasThreadNote: Boolean(message.hasThreadNote),
    mailbox: message.mailbox
  }
}

export const POST: RequestHandler = async ({ request, locals }) => {
  const body = (await request.json().catch(() => null)) as { query?: unknown } | null
  const query = typeof body?.query === 'string' ? body.query.trim() : ''
  if (!query) error(400, 'Missing search query')
  if (query.length > MAX_QUERY_CHARS) error(400, 'Search query is too long')

  if (isDemoModeEnabled()) {
    const messages = searchDemoMessages(query, 50, 0)
    return json({ messages: messages.map(serializeMessage), total: messages.length, patterns: [] })
  }
  if (!(await isOpenAIConfigured())) error(503, 'OpenAI is not configured')

  const searchKey = locals.user?.id ?? 'authenticated-user'
  const now = Date.now()
  if (
    activeSearches.has(searchKey) ||
    now - (lastSearchAt.get(searchKey) ?? 0) < SEARCH_COOLDOWN_MS
  ) {
    error(429, 'An AI search is already running. Please wait a moment.')
  }
  activeSearches.add(searchKey)
  lastSearchAt.set(searchKey, now)

  try {
    const result = await runNaturalMailSearch(query, request.signal)
    return json({
      messages: result.messages.map(serializeMessage),
      total: result.messages.length,
      patterns: result.patterns
    })
  } catch (err) {
    logServerError('api.ai.search', err, { queryLength: query.length })
    error(502, 'AI search failed')
  } finally {
    activeSearches.delete(searchKey)
  }
}
