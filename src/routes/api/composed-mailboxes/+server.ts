import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  createComposedMailbox,
  isComposedMailboxConflict,
  listComposedMailboxes,
  normalizeComposedMailboxName,
  normalizeComposedMailboxPaths
} from '$lib/server/composed-mailboxes'
import { getImapMailboxes } from '$lib/server/mail'
import { pathToSlug } from '$lib/mailbox'
import { isDemoModeEnabled } from '$lib/server/demo'

async function parseDefinition(request: Request) {
  const body = await request.json().catch(() => error(400, 'Invalid JSON body'))
  const name = normalizeComposedMailboxName(body?.name)
  const mailboxPaths = normalizeComposedMailboxPaths(body?.mailboxPaths)
  if (!name) error(400, 'name is required')
  if (mailboxPaths.length < 2) error(400, 'Select at least two mailboxes')

  const mailboxes = await getImapMailboxes()
  const availablePaths = new Set(mailboxes.map((mailbox) => mailbox.path))
  const missing = mailboxPaths.filter((path) => !availablePaths.has(path))
  if (missing.length > 0) error(400, `Unknown mailbox: ${missing[0]}`)
  return {
    name,
    mailboxPaths,
    physicalSlugs: new Set(mailboxes.map((mailbox) => pathToSlug(mailbox.path)))
  }
}

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json({ composedMailboxes: [] })
  return json({ composedMailboxes: await listComposedMailboxes() })
}

export const POST: RequestHandler = async ({ request }) => {
  if (isDemoModeEnabled()) error(403, 'Composed mailboxes are unavailable in demo mode')
  const definition = await parseDefinition(request)
  try {
    const composedMailbox = await createComposedMailbox(
      definition.name,
      definition.mailboxPaths,
      definition.physicalSlugs
    )
    return json({ composedMailbox }, { status: 201 })
  } catch (cause) {
    if (isComposedMailboxConflict(cause)) error(409, 'A composed mailbox with this name exists')
    throw cause
  }
}
