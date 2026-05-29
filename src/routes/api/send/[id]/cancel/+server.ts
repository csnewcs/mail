import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { smtpJob } from '$lib/server/db/schema'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid send job ID')

  if (isDemoModeEnabled()) {
    return error(409, 'Demo messages are sent immediately')
  }

  const now = new Date()
  const [job] = await db
    .update(smtpJob)
    .set({ status: 'canceled', updatedAt: now, lastError: null })
    .where(and(eq(smtpJob.id, id), eq(smtpJob.status, 'pending')))
    .returning({ id: smtpJob.id })

  if (!job) return error(409, 'Message is no longer pending')

  return json({ success: true, canceled: true, jobId: job.id })
}
