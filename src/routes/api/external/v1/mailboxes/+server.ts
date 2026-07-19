import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getImapMailboxes } from '$lib/server/mail'
import { pathToSlug } from '$lib/mailbox'

export const GET: RequestHandler = async () => {
  const mailboxes = await getImapMailboxes()
  return json({
    mailboxes: mailboxes.map((mailbox) => ({ ...mailbox, slug: pathToSlug(mailbox.path) }))
  })
}
