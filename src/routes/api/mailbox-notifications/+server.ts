import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  getMailboxNotificationRules,
  setMailboxNotificationRule
} from '$lib/server/mailbox-notifications'
import { getImapMailboxes } from '$lib/server/mail'
import { isDemoModeEnabled } from '$lib/server/demo'
import { isAlwaysReadMailbox } from '$lib/mailbox'

export const GET: RequestHandler = async () => {
  const mailboxes = await getImapMailboxes()

  if (isDemoModeEnabled()) {
    return json({
      rules: mailboxes.map(({ path }) => ({
        mailbox: path,
        enabled: true,
        canNotify: !isAlwaysReadMailbox(path)
      }))
    })
  }

  return json({ rules: await getMailboxNotificationRules(mailboxes) })
}

export const PUT: RequestHandler = async ({ request }) => {
  const body = (await request.json()) as { mailbox?: unknown; enabled?: unknown }

  if (typeof body.mailbox !== 'string' || !body.mailbox.trim()) {
    return error(400, 'Mailbox is required.')
  }

  if (typeof body.enabled !== 'boolean') {
    return error(400, 'Enabled must be a boolean.')
  }

  if (!isDemoModeEnabled()) {
    await setMailboxNotificationRule(body.mailbox, body.enabled)
  }

  return json({ success: true })
}
