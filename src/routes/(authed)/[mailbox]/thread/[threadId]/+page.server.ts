import { error, redirect } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import {
  getMessagesInThread,
  getThreadMetadata,
  markMessagesSeen,
  getMailboxRole,
  resolveMailboxPath
} from '$lib/server/mail'
import { decodeThreadId } from '$lib/thread-url'
import { db } from '$lib/server/db'
import { mailAttachment } from '$lib/server/db/schema'
import { payloadBytes, perfLog, perfMs, perfNow } from '$lib/server/perf'
import { inArray } from 'drizzle-orm'
import {
  isDemoModeEnabled,
  listDemoAttachmentsForMessages,
  markDemoMessagesSeen
} from '$lib/server/demo'
import { getStoredPreferences } from '$lib/server/preferences'
import { getThreadNote, serializeThreadNote } from '$lib/server/thread-notes'
import { unreadMessageRows } from '$lib/read-state'

function serializeMessage(message: Awaited<ReturnType<typeof getMessagesInThread>>[number]) {
  const flags = JSON.parse(message.flags) as string[]

  return {
    id: message.id,
    uid: message.uid,
    messageId: message.messageId,
    mailbox: message.mailbox,
    subject: message.subject,
    from: message.from,
    to: message.to,
    cc: message.cc,
    preview: message.preview,
    textContent: message.textContent,
    htmlContent: message.htmlContent,
    inReplyTo: message.inReplyTo,
    references: message.references,
    spfStatus: message.spfStatus ?? null,
    dkimStatus: message.dkimStatus ?? null,
    dmarcStatus: message.dmarcStatus ?? null,
    authenticationTrusted: message.authenticationTrusted ?? false,
    rawSourceAvailable: message.rawSourceAvailable ?? isDemoModeEnabled(),
    flags,
    receivedAt: message.receivedAt?.toISOString() ?? null,
    snoozedUntil: message.snoozedUntil?.toISOString() ?? null,
    threadDepth: message.threadDepth ?? 0
  }
}

export const load: PageServerLoad = async ({ params }) => {
  const startedAt = perfNow()
  const threadId = decodeThreadId(params.threadId)
  const mailboxPath = await resolveMailboxPath(params.mailbox)
  const messages = await getMessagesInThread(threadId, mailboxPath)

  if (messages.length === 0) {
    error(404, 'Thread not found')
  }

  if (messages.length === 1) {
    redirect(302, `/${params.mailbox}/${messages[0].id}`)
  }

  const unreadMessages = unreadMessageRows(messages)
  const unreadIds = unreadMessages.map((message) => message.id)
  if (unreadIds.length > 0) {
    if (isDemoModeEnabled()) markDemoMessagesSeen(unreadIds, true)
    else await markMessagesSeen(unreadIds, true)
  }
  for (const message of unreadMessages) {
    const flags = JSON.parse(message.flags) as string[]
    message.flags = JSON.stringify([...flags, '\\Seen'])
  }

  const messageIds = messages.map((m) => m.messageId)

  // Load attachment metadata for all messages in the thread
  const attachments =
    messageIds.length > 0
      ? isDemoModeEnabled()
        ? listDemoAttachmentsForMessages(messageIds)
        : await db
            .select({
              id: mailAttachment.id,
              messageId: mailAttachment.messageId,
              filename: mailAttachment.filename,
              contentType: mailAttachment.contentType,
              size: mailAttachment.size
            })
            .from(mailAttachment)
            .where(inArray(mailAttachment.messageId, messageIds))
      : []

  const [mailboxRole, metadata, threadNote] = await Promise.all([
    Promise.resolve(getMailboxRole(mailboxPath)),
    getThreadMetadata(mailboxPath, threadId),
    getThreadNote(threadId)
  ])

  const preferences = await getStoredPreferences()
  const body = {
    threadId,
    mailbox: mailboxPath,
    messages: messages.map(serializeMessage),
    attachments,
    mailboxRole,
    remoteContent: preferences.remoteContent,
    threadNote: serializeThreadNote(threadNote),
    metadata
  }

  perfLog('load.threadPage', {
    mailbox: mailboxPath,
    threadId,
    messages: body.messages.length,
    attachments: attachments.length,
    payloadBytes: payloadBytes(body),
    ms: perfMs(startedAt)
  })

  return body
}
