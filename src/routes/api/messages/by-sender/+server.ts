import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  countMessagesBySender,
  getMailboxRole,
  listMessagesBySender,
  moveMessage,
  normalizeSenderAddress,
  resolveMailboxPath,
  type MessageAction
} from '$lib/server/mail'

const VALID_ACTIONS = new Set<MessageAction>(['archive', 'trash'])

function readMailbox(url: URL) {
  const mailbox = url.searchParams.get('mailbox')?.trim()
  if (!mailbox) error(400, 'mailbox is required')
  return mailbox
}

function readSender(url: URL) {
  const sender = url.searchParams.get('sender')?.trim()
  if (!sender) error(400, 'sender is required')

  const normalizedSender = normalizeSenderAddress(sender)
  if (!normalizedSender) error(400, 'sender is invalid')

  return { sender, normalizedSender }
}

function validateAction(action: string | undefined, mailboxPath: string) {
  if (!action || !VALID_ACTIONS.has(action as MessageAction)) error(400, 'Invalid action')

  const currentRole = getMailboxRole(mailboxPath)
  if (currentRole === action) error(400, `Messages are already in ${action}`)

  return action as MessageAction
}

export const GET: RequestHandler = async ({ url }) => {
  const mailboxPath = await resolveMailboxPath(readMailbox(url))
  const { sender, normalizedSender } = readSender(url)
  const action = url.searchParams.get('action')?.trim()
  if (action) validateAction(action, mailboxPath)

  const count = await countMessagesBySender(mailboxPath, normalizedSender)
  return json({ count, mailbox: mailboxPath, sender, normalizedSender })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null)
  const mailbox = typeof body?.mailbox === 'string' ? body.mailbox.trim() : ''
  const sender = typeof body?.sender === 'string' ? body.sender.trim() : ''
  const expectedCount = Number(body?.expectedCount)

  if (!mailbox) error(400, 'mailbox is required')
  if (!sender) error(400, 'sender is required')
  if (!Number.isInteger(expectedCount) || expectedCount < 0) error(400, 'expectedCount is required')

  const mailboxPath = await resolveMailboxPath(mailbox)
  const action = validateAction(
    typeof body?.action === 'string' ? body.action : undefined,
    mailboxPath
  )
  const normalizedSender = normalizeSenderAddress(sender)
  if (!normalizedSender) error(400, 'sender is invalid')

  const currentCount = await countMessagesBySender(mailboxPath, normalizedSender)
  if (currentCount !== expectedCount) {
    error(409, `Sender message count changed from ${expectedCount} to ${currentCount}`)
  }

  const messages = await listMessagesBySender(mailboxPath, normalizedSender)
  let count = 0
  for (const message of messages) {
    const result = await moveMessage(message, action)
    if (result) count++
  }

  return json({ ok: true, count, mailbox: mailboxPath, sender, normalizedSender, action })
}
