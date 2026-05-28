import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getMessagesInThread, markMessageAsRead, resolveMailboxPath } from '$lib/server/mail'
import { decodeThreadId } from '$lib/thread-url'

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
  const unreadMessages = messages.filter((message) => {
    const flags = JSON.parse(message.flags) as string[]
    return !flags.includes('\\Seen')
  })

  await Promise.all(unreadMessages.map((message) => markMessageAsRead(message)))

  return json({ ok: true, count: unreadMessages.length })
}
