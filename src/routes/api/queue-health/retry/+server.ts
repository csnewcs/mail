import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { imapJob, smtpJob } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  const id = Number(body.id)
  const queue = body.queue
  if (!Number.isFinite(id) || (queue !== 'imap' && queue !== 'smtp')) {
    return error(400, 'Expected queue and id')
  }

  const now = new Date()
  const table = queue === 'imap' ? imapJob : smtpJob
  await db
    .update(table)
    .set({ status: 'pending', attemptCount: 0, availableAt: now, lastError: null, updatedAt: now })
    .where(eq(table.id, id))

  return json({ ok: true })
}
