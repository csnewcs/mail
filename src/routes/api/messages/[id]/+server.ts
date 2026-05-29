import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  getStoredMessageById,
  moveMessage,
  snoozeMessages,
  type MessageAction
} from '$lib/server/mail'

const VALID_ACTIONS = new Set<MessageAction>(['archive', 'trash', 'spam', 'inbox'])

function parseSnoozedUntil(value: unknown) {
  if (value === null) return null
  if (typeof value !== 'string') return undefined

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return undefined
  return date
}

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => null)
  const action = body?.action as string | undefined

  if (action === 'snooze' || action === 'unsnooze') {
    const snoozedUntil = action === 'unsnooze' ? null : parseSnoozedUntil(body?.snoozedUntil)
    if (snoozedUntil === undefined) error(400, 'snoozedUntil must be a valid date')
    if (snoozedUntil !== null && snoozedUntil.getTime() <= Date.now()) {
      error(400, 'snoozedUntil must be in the future')
    }

    const count = await snoozeMessages([Number(params.id)], snoozedUntil)
    if (count === 0) error(404, 'Message not found')

    return json({ ok: true, snoozedUntil: snoozedUntil?.toISOString() ?? null })
  }

  if (!action || !VALID_ACTIONS.has(action as MessageAction)) {
    error(400, 'Invalid action')
  }

  const message = await getStoredMessageById(params.id)
  if (!message) error(404, 'Message not found')

  const targetMailbox = await moveMessage(message, action as MessageAction)
  if (!targetMailbox) error(422, 'Target mailbox not found')

  return json({ ok: true, targetMailbox })
}

function serializeMessage(message: NonNullable<Awaited<ReturnType<typeof getStoredMessageById>>>) {
  return {
    id: message.id,
    uid: message.uid,
    subject: message.subject,
    from: message.from,
    to: message.to,
    preview: message.preview,
    textContent: message.textContent,
    htmlContent: message.htmlContent,
    flags: JSON.parse(message.flags) as string[],
    receivedAt: message.receivedAt?.toISOString() ?? null,
    snoozedUntil: message.snoozedUntil?.toISOString() ?? null
  }
}

export const GET: RequestHandler = async ({ params }) => {
  const message = await getStoredMessageById(params.id)

  if (!message) {
    error(404, 'Message not found')
  }

  return json({ message: serializeMessage(message) })
}
