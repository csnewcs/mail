import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { generateDemoThreadActions, isDemoModeEnabled } from '$lib/server/demo'
import { getMessagesInThread, resolveMailboxPath } from '$lib/server/mail'
import { generateOpenAIText } from '$lib/server/openai'
import { logServerError } from '$lib/server/perf'

const MAX_MESSAGE_BODY_CHARS = 4_000
const MAX_ACTIONS = 12

type ThreadMessage = Awaited<ReturnType<typeof getMessagesInThread>>[number]

export type ThreadActionItem = {
  title: string
  description: string | null
  owner: string | null
  dueDate: string | null
  priority: 'low' | 'medium' | 'high'
  sourceMessageId: string | null
}

type ThreadActionsCacheEntry = {
  fingerprint: string
  actions: ThreadActionItem[]
  count: number
}

const threadActionsCache = new Map<string, ThreadActionsCacheEntry>()

function trimBody(value: string | null | undefined) {
  const text = value?.trim()
  if (!text) return 'No body text available.'
  if (text.length <= MAX_MESSAGE_BODY_CHARS) return text
  return `${text.slice(0, MAX_MESSAGE_BODY_CHARS)}\n[Message body truncated]`
}

function threadActionsInput(messages: ThreadMessage[]) {
  return messages
    .map((message, index) =>
      [
        `#${index + 1}`,
        `Database ID: ${message.id}`,
        `Message-ID: ${message.messageId}`,
        `Subject: ${message.subject || '(no subject)'}`,
        `From: ${message.from || 'Unknown sender'}`,
        `To: ${message.to || ''}`,
        `Cc: ${message.cc || ''}`,
        `Received: ${message.receivedAt?.toISOString() ?? 'Unknown'}`,
        `Preview: ${message.preview || ''}`,
        `Body:\n${trimBody(message.textContent || message.preview)}`
      ].join('\n')
    )
    .join('\n\n---\n\n')
}

function threadFingerprint(messages: ThreadMessage[]) {
  return messages
    .map((message) =>
      [
        message.id,
        message.messageId,
        message.receivedAt?.toISOString() ?? '',
        message.subject,
        message.from,
        message.to,
        message.cc,
        message.preview,
        message.textContent?.length ?? 0
      ].join(':')
    )
    .join('|')
}

function normalizePriority(value: unknown): ThreadActionItem['priority'] {
  return value === 'high' || value === 'low' ? value : 'medium'
}

function stringOrNull(value: unknown, maxLength = 500) {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  if (!trimmed) return null
  return trimmed.slice(0, maxLength)
}

function validateThreadActions(value: unknown): ThreadActionItem[] {
  if (!value || typeof value !== 'object') {
    throw new Error('Thread action response was not a JSON object')
  }

  const actions = (value as { actions?: unknown }).actions
  if (!Array.isArray(actions)) {
    throw new Error('Thread action response did not include an actions array')
  }

  return actions
    .slice(0, MAX_ACTIONS)
    .map((item) => {
      if (!item || typeof item !== 'object') return null
      const record = item as Record<string, unknown>
      const title = stringOrNull(record.title, 160)
      if (!title) return null

      return {
        title,
        description: stringOrNull(record.description, 700),
        owner: stringOrNull(record.owner, 160),
        dueDate: stringOrNull(record.dueDate, 80),
        priority: normalizePriority(record.priority),
        sourceMessageId: stringOrNull(record.sourceMessageId, 255)
      }
    })
    .filter((item): item is ThreadActionItem => item !== null)
}

function parseThreadActionsJson(output: string) {
  const trimmed = output.trim()
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1]
  const candidate = fenced ?? trimmed

  try {
    return validateThreadActions(JSON.parse(candidate) as unknown)
  } catch (err) {
    if (fenced) throw err

    const start = candidate.indexOf('{')
    const end = candidate.lastIndexOf('}')
    if (start === -1 || end <= start) throw err
    return validateThreadActions(JSON.parse(candidate.slice(start, end + 1)) as unknown)
  }
}

export const GET: RequestHandler = async ({ url }) => {
  const mailboxSlug = url.searchParams.get('mailbox') ?? 'inbox'
  const threadId = url.searchParams.get('threadId')
  if (!threadId) error(400, 'Missing threadId')

  const mailboxPath = await resolveMailboxPath(mailboxSlug)
  const messages = await getMessagesInThread(threadId, mailboxPath)

  if (messages.length === 0) {
    threadActionsCache.delete(`${mailboxPath}:${threadId}`)
    error(404, 'Thread not found')
  }

  if (isDemoModeEnabled()) {
    const actions = generateDemoThreadActions(mailboxPath, threadId)
    if (!actions) error(404, 'Thread not found')

    return json(
      { actions },
      {
        headers: {
          'x-ai-cache': 'demo',
          'x-ai-thread-message-count': String(messages.length),
          'x-ai-mailbox': mailboxPath
        }
      }
    )
  }

  const cacheKey = `${mailboxPath}:${threadId}`
  const fingerprint = threadFingerprint(messages)
  const cached = threadActionsCache.get(cacheKey)

  if (cached?.fingerprint === fingerprint) {
    return json(
      { actions: cached.actions },
      {
        headers: {
          'x-ai-cache': 'hit',
          'x-ai-thread-message-count': String(cached.count),
          'x-ai-mailbox': mailboxPath
        }
      }
    )
  }

  try {
    const output = await generateOpenAIText({
      instructions: [
        'Extract concrete action items from an email conversation thread for the current user.',
        'Return only valid JSON with this exact shape: {"actions":[{"title":"...","description":null,"owner":null,"dueDate":null,"priority":"medium","sourceMessageId":null}]}',
        'Only include actions explicitly requested, promised, or clearly required by the thread.',
        'Use null when owner, due date, or source message is unclear.',
        'Use priority values low, medium, or high. Prefer medium unless the thread indicates urgency.',
        'If there are no actions, return {"actions":[]}.'
      ].join(' '),
      input: threadActionsInput(messages),
      maxOutputTokens: 900
    })
    const actions = parseThreadActionsJson(output)

    threadActionsCache.set(cacheKey, {
      fingerprint,
      actions,
      count: messages.length
    })

    return json(
      { actions },
      {
        headers: {
          'x-ai-cache': 'miss',
          'x-ai-thread-message-count': String(messages.length),
          'x-ai-mailbox': mailboxPath
        }
      }
    )
  } catch (err) {
    logServerError('api.ai.thread-actions', err, { mailbox: mailboxPath, threadId })
    error(502, err instanceof Error ? err.message : 'Thread action extraction failed')
  }
}
