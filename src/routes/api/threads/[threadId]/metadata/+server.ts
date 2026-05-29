import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getThreadMetadata, resolveMailboxPath, setThreadMetadata } from '$lib/server/mail'
import { decodeThreadId } from '$lib/thread-url'

function parseBooleanPatch(value: unknown, name: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') error(400, `${name} must be a boolean`)
  return value
}

export const GET: RequestHandler = async ({ params, url }) => {
  const mailbox = await resolveMailboxPath(url.searchParams.get('mailbox') ?? 'inbox')
  const threadKey = decodeThreadId(params.threadId)
  const metadata = await getThreadMetadata(mailbox, threadKey)

  return json({ metadata })
}

export const POST: RequestHandler = async ({ params, request }) => {
  const body = await request.json().catch(() => null)
  if (!body || typeof body !== 'object') error(400, 'Invalid request body')

  const mailboxParam = (body as { mailbox?: unknown }).mailbox
  if (typeof mailboxParam !== 'string' || !mailboxParam.trim()) error(400, 'mailbox is required')

  const starred = parseBooleanPatch((body as { starred?: unknown }).starred, 'starred')
  const pinned = parseBooleanPatch((body as { pinned?: unknown }).pinned, 'pinned')
  if (starred === undefined && pinned === undefined) error(400, 'No metadata fields provided')

  const mailbox = await resolveMailboxPath(mailboxParam)
  const threadKey = decodeThreadId(params.threadId)
  const metadata = await setThreadMetadata(mailbox, threadKey, { starred, pinned })

  return json({ ok: true, metadata })
}
