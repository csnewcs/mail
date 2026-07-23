import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { composedMailbox, mailboxCatalog } from '$lib/server/db/schema'
import { updateStoredPreferences } from '$lib/server/preferences'
import { normalizeMailboxPreferences } from '$lib/mailbox-preferences'

export const PATCH: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => ({}))
  if (!body.preferences || typeof body.preferences !== 'object') {
    return error(400, 'preferences object is required')
  }

  try {
    const preferences = body.preferences as {
      order?: unknown
      hidden?: unknown
      collapsedAccounts?: unknown
    }
    const validatesMailboxPaths = 'order' in preferences || 'hidden' in preferences
    const [mailboxes, composedMailboxes] = validatesMailboxPaths
      ? await Promise.all([
          db.select({ key: mailboxCatalog.path }).from(mailboxCatalog),
          db.select({ key: composedMailbox.slug }).from(composedMailbox)
        ])
      : [[], []]
    const validPathSet = new Set([...mailboxes, ...composedMailboxes].map((mailbox) => mailbox.key))
    const filterPaths = (value: unknown) =>
      Array.isArray(value)
        ? value.filter((path): path is string => typeof path === 'string' && validPathSet.has(path))
        : []
    const patch: Record<string, string[]> = {}
    if ('order' in preferences) patch.order = filterPaths(preferences.order)
    if ('hidden' in preferences) patch.hidden = filterPaths(preferences.hidden)
    if ('collapsedAccounts' in preferences) {
      patch.collapsedAccounts = normalizeMailboxPreferences({
        collapsedAccounts: preferences.collapsedAccounts
      }).collapsedAccounts
    }
    const stored = await updateStoredPreferences({ mailboxPreferences: patch })

    return json({ success: true, preferences: stored.mailboxPreferences })
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err)
    return error(500, `Failed to update mailbox preferences: ${message}`)
  }
}
