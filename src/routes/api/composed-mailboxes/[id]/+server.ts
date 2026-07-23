import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  deleteComposedMailbox,
  isComposedMailboxConflict,
  normalizeComposedMailboxName,
  normalizeComposedMailboxPaths,
  updateComposedMailbox
} from '$lib/server/composed-mailboxes'
import { getImapMailboxes } from '$lib/server/mail'
import { isDemoModeEnabled } from '$lib/server/demo'

function parseId(value: string) {
  const id = Number(value)
  if (!Number.isInteger(id) || id <= 0) error(400, 'Invalid composed mailbox ID')
  return id
}

async function parseDefinition(request: Request) {
  const body = await request.json().catch(() => error(400, 'Invalid JSON body'))
  const name = normalizeComposedMailboxName(body?.name)
  const mailboxPaths = normalizeComposedMailboxPaths(body?.mailboxPaths)
  if (!name) error(400, 'name is required')
  if (mailboxPaths.length < 2) error(400, 'Select at least two mailboxes')

  const availablePaths = new Set((await getImapMailboxes()).map((mailbox) => mailbox.path))
  const missing = mailboxPaths.filter((path) => !availablePaths.has(path))
  if (missing.length > 0) error(400, `Unknown mailbox: ${missing[0]}`)
  return { name, mailboxPaths }
}

export const PUT: RequestHandler = async ({ params, request }) => {
  if (isDemoModeEnabled()) error(403, 'Composed mailboxes are unavailable in demo mode')
  const id = parseId(params.id)
  const definition = await parseDefinition(request)
  try {
    const composedMailbox = await updateComposedMailbox(
      id,
      definition.name,
      definition.mailboxPaths
    )
    if (!composedMailbox) error(404, 'Composed mailbox not found')
    return json({ composedMailbox })
  } catch (cause) {
    if (isComposedMailboxConflict(cause)) error(409, 'A composed mailbox with this name exists')
    throw cause
  }
}

export const DELETE: RequestHandler = async ({ params }) => {
  if (isDemoModeEnabled()) error(403, 'Composed mailboxes are unavailable in demo mode')
  if (!(await deleteComposedMailbox(parseId(params.id)))) error(404, 'Composed mailbox not found')
  return json({ ok: true })
}
