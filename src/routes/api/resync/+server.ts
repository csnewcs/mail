import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailboxSync } from '$lib/server/db/schema'

export const POST: RequestHandler = async () => {
  await db.update(mailboxSync).set({ lastUid: 0, historyComplete: false, lastError: null })
  return json({ ok: true })
}
