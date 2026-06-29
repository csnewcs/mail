import type { PageServerLoad } from './$types'
import {
  countStoredThreads,
  countStoredMessages,
  listStoredMessages,
  listStoredThreads,
  resolveMailboxPath
} from '$lib/server/mail'
import { payloadBytes, perfLog, perfMs, perfNow } from '$lib/server/perf'
import { getThreadModeOnPageLoadEnabled } from '$lib/server/preferences'

const PAGE_SIZE = 50

type ListRow =
  | Awaited<ReturnType<typeof listStoredThreads>>[number]
  | Awaited<ReturnType<typeof listStoredMessages>>[number]

function serializeMessage(message: ListRow) {
  return {
    id: message.id,
    messageId: message.messageId,
    mailbox: message.mailbox,
    uid: message.uid,
    subject: message.subject,
    from: message.from,
    to: message.to,
    preview: message.preview,
    flags: JSON.parse(message.flags) as string[],
    receivedAt: message.receivedAt?.toISOString() ?? null,
    snoozedUntil: message.snoozedUntil?.toISOString() ?? null,
    threadId: message.threadId ?? null,
    hasThreadNote: 'hasThreadNote' in message ? Boolean(message.hasThreadNote) : false,
    ...('threadCount' in message ? { threadCount: message.threadCount } : {}),
    ...('hasUnread' in message ? { hasUnread: message.hasUnread } : {}),
    threadStarred: 'threadStarred' in message ? (message.threadStarred ?? false) : false,
    threadPinned: 'threadPinned' in message ? (message.threadPinned ?? false) : false
  }
}

export const load: PageServerLoad = async ({ params, parent, cookies }) => {
  const startedAt = perfNow()
  const { imapMailboxes } = await parent()
  const mailboxPath = await resolveMailboxPath(params.mailbox, imapMailboxes)
  const threaded = getThreadModeOnPageLoadEnabled(cookies)
  const [rawMessages, total] = await Promise.all(
    threaded
      ? [listStoredThreads(mailboxPath, PAGE_SIZE + 1, 0), countStoredThreads(mailboxPath)]
      : [listStoredMessages(mailboxPath, PAGE_SIZE + 1, 0), countStoredMessages(mailboxPath)]
  )
  const hasMore = rawMessages.length > PAGE_SIZE

  const body = {
    messages: rawMessages.slice(0, PAGE_SIZE).map(serializeMessage),
    hasMore,
    pageSize: PAGE_SIZE,
    total,
    threaded
  }

  perfLog('load.mailboxPage', {
    mailbox: mailboxPath,
    rows: body.messages.length,
    hasMore,
    payloadBytes: payloadBytes(body),
    ms: perfMs(startedAt)
  })

  return body
}
