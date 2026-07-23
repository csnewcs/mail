import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getThreadMetadata, resolveMailboxScope, setThreadMetadata } from '$lib/server/mail'
import { decodeThreadId } from '$lib/thread-url'

function parseBooleanPatch(value: unknown, name: string) {
  if (value === undefined) return undefined
  if (typeof value !== 'boolean') error(400, `${name} must be a boolean`)
  return value
}

export const GET: RequestHandler = async ({ params, url }) => {
  const scope = await resolveMailboxScope(url.searchParams.get('mailbox') ?? 'inbox')
  const threadKey = decodeThreadId(params.threadId)
  const rows = await Promise.all(
    scope.paths.map((mailbox) => getThreadMetadata(mailbox, threadKey))
  )
  const metadata = {
    starred: rows.some((row) => row.starred),
    pinned: rows.some((row) => row.pinned)
  }

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

  const scope = await resolveMailboxScope(mailboxParam)
  const threadKey = decodeThreadId(params.threadId)
  const rows = await Promise.all(
    scope.paths.map((mailbox) => setThreadMetadata(mailbox, threadKey, { starred, pinned }))
  )
  const metadata = {
    starred: rows.some((row) => row.starred),
    pinned: rows.some((row) => row.pinned)
  }

  return json({ ok: true, metadata })
}
