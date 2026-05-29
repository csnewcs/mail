import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { generateDemoAiReplyDraft, isDemoModeEnabled } from '$lib/server/demo'
import { getMessagesInThread, getStoredMessageById, resolveMailboxPath } from '$lib/server/mail'
import { generateOpenAIText } from '$lib/server/openai'
import { logServerError } from '$lib/server/perf'

const MAX_MESSAGE_BODY_CHARS = 3_500

type ReplyDraftMessage = NonNullable<Awaited<ReturnType<typeof getStoredMessageById>>>

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readPositiveInteger(value: unknown) {
  const number = typeof value === 'number' ? value : parseInt(String(value ?? ''), 10)
  return Number.isInteger(number) && number > 0 ? number : null
}

function stripCodeFence(value: string) {
  return value
    .replace(/^```(?:html)?\s*/i, '')
    .replace(/\s*```$/i, '')
    .trim()
}

function normalizeHtml(value: string) {
  const html = stripCodeFence(value)
  if (!html) throw new Error('OpenAI returned an empty reply draft')
  return html
}

function trimBody(value: string | null | undefined) {
  const text = value?.trim()
  if (!text) return 'No body text available.'
  if (text.length <= MAX_MESSAGE_BODY_CHARS) return text
  return `${text.slice(0, MAX_MESSAGE_BODY_CHARS)}\n[Message body truncated]`
}

function messageInput(messages: ReplyDraftMessage[], targetMessageId: number) {
  return messages
    .map((message, index) =>
      [
        `#${index + 1}${message.id === targetMessageId ? ' (reply target)' : ''}`,
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

async function loadContext(body: unknown) {
  const messageId = readPositiveInteger((body as { messageId?: unknown } | null)?.messageId)
  if (!messageId) error(400, 'messageId is required')

  const mailboxSlug = readString((body as { mailbox?: unknown } | null)?.mailbox) || 'inbox'
  const threadId = readString((body as { threadId?: unknown } | null)?.threadId)
  const targetMessage = await getStoredMessageById(messageId)
  if (!targetMessage) error(404, 'Message not found')

  if (!threadId) return { messages: [targetMessage], targetMessage }

  const mailboxPath = await resolveMailboxPath(mailboxSlug)
  const threadMessages = await getMessagesInThread(threadId, mailboxPath)
  if (threadMessages.length === 0) return { messages: [targetMessage], targetMessage }

  return { messages: threadMessages, targetMessage }
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null)
  const { messages, targetMessage } = await loadContext(body)
  const replyAll = Boolean((body as { replyAll?: unknown } | null)?.replyAll)

  if (isDemoModeEnabled()) {
    return json({ html: generateDemoAiReplyDraft(messages, targetMessage, replyAll) })
  }

  try {
    const output = await generateOpenAIText({
      instructions: [
        'You draft contextual email replies for the user.',
        'Return only the new reply body as HTML for a rich text email editor.',
        'Use simple tags only: p, br, ul, ol, li, strong, em, a.',
        'Do not include html, head, body, style, script, blockquote, signatures, greetings with unknown names, or code fences.',
        'Use the conversation context and reply directly to the reply target.',
        'Be concise, helpful, and specific. Preserve the language used by the conversation; if unclear, write in Korean.',
        'Do not invent names, commitments, dates, attachments, or facts not present in the input.'
      ].join(' '),
      input: [
        `Reply mode: ${replyAll ? 'reply all' : 'reply'}`,
        `Target subject: ${targetMessage.subject || '(no subject)'}`,
        `Target from: ${targetMessage.from || 'Unknown sender'}`,
        `Thread messages:\n${messageInput(messages, targetMessage.id)}`
      ].join('\n\n'),
      maxOutputTokens: 900,
      maxInputChars: 18_000
    })

    return json({ html: normalizeHtml(output) })
  } catch (err) {
    logServerError('api.ai.reply-draft', err, {
      messageId: targetMessage.id,
      threadId: readString((body as { threadId?: unknown } | null)?.threadId),
      messageCount: messages.length
    })
    error(502, err instanceof Error ? err.message : 'AI reply draft failed')
  }
}
