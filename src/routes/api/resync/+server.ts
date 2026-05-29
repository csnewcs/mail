import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailboxSync } from '$lib/server/db/schema'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json({ ok: true })

  await db.update(mailboxSync).set({ lastUid: 0, historyComplete: false, lastError: null })
  return json({ ok: true })
}
