import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getMessagesInThread, markMessagesSeen, resolveMailboxPath } from '$lib/server/mail'
import { unreadMessageRows } from '$lib/read-state'
import { decodeThreadId } from '$lib/thread-url'
import { isDemoModeEnabled, markDemoMessagesSeen } from '$lib/server/demo'

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => error(400, 'Invalid JSON body'))

  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return error(400, 'JSON body must be an object')
  }

  if ('mailbox' in body && typeof body.mailbox !== 'string') {
    return error(400, 'mailbox must be a string')
  }

  const mailboxPath = await resolveMailboxPath(body.mailbox ?? 'inbox')
  const threadId = decodeThreadId(params.threadId)

  if (!threadId) {
    return error(400, 'threadId is required')
  }

  const messages = await getMessagesInThread(threadId, mailboxPath)
  const unreadMessages = unreadMessageRows(messages)

  const ids = unreadMessages.map((message) => message.id)
  const count =
    ids.length === 0
      ? 0
      : isDemoModeEnabled()
        ? markDemoMessagesSeen(ids, true)
        : await markMessagesSeen(ids, true)

  return json({ ok: true, count })
}
