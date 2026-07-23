import type { PageServerLoad } from './$types'
import {
  countStoredThreadsInMailboxes,
  countStoredMessagesInMailboxes,
  listStoredMessagesInMailboxes,
  listStoredThreadsInMailboxes,
  resolveMailboxScope
} from '$lib/server/mail'
import { payloadBytes, perfLog, perfMs, perfNow } from '$lib/server/perf'
import { getStoredPreferences } from '$lib/server/preferences'
import { serializeDate } from '$lib/serialize-date'

const PAGE_SIZE = 50

type ListRow =
  | Awaited<ReturnType<typeof listStoredThreadsInMailboxes>>[number]
  | Awaited<ReturnType<typeof listStoredMessagesInMailboxes>>[number]

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
    important: 'important' in message ? (message.important ?? false) : false,
    sendStatus: message.sendStatus ?? null,
    smtpJobId: message.smtpJobId ?? null,
    openedAt: 'openedAt' in message ? serializeDate(message.openedAt) : null,
    ...('threadCount' in message ? { threadCount: message.threadCount } : {}),
    ...('hasUnread' in message ? { hasUnread: message.hasUnread } : {}),
    ...('hasImportantUnread' in message ? { hasImportantUnread: message.hasImportantUnread } : {}),
    threadStarred: 'threadStarred' in message ? (message.threadStarred ?? false) : false,
    threadPinned: 'threadPinned' in message ? (message.threadPinned ?? false) : false
  }
}

export const load: PageServerLoad = async ({ params, parent }) => {
  const startedAt = perfNow()
  const { imapMailboxes } = await parent()
  const scope = await resolveMailboxScope(params.mailbox, imapMailboxes)
  const threaded = (await getStoredPreferences()).threadModeOnPageLoad
  const [rawMessages, total] = await Promise.all(
    threaded
      ? [
          listStoredThreadsInMailboxes(scope.paths, PAGE_SIZE + 1, 0),
          countStoredThreadsInMailboxes(scope.paths)
        ]
      : [
          listStoredMessagesInMailboxes(scope.paths, PAGE_SIZE + 1, 0),
          countStoredMessagesInMailboxes(scope.paths)
        ]
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
    mailbox: scope.path,
    rows: body.messages.length,
    hasMore,
    payloadBytes: payloadBytes(body),
    ms: perfMs(startedAt)
  })

  return body
}
