import { error, json } from '@sveltejs/kit'
import { and, eq } from 'drizzle-orm'
import type { RequestHandler } from './$types'
import { sendStatusFromJobStatus } from '$lib/send-status'
import { db } from '$lib/server/db'
import { mailMessageMailbox, smtpJob } from '$lib/server/db/schema'

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return error(400, 'Invalid send job ID')

  const [job] = await db
    .select({
      status: smtpJob.status,
      deliveredAt: smtpJob.deliveredAt,
      openedAt: smtpJob.openedAt,
      lastError: smtpJob.lastError,
      messageId: smtpJob.messageId,
      sentMailbox: smtpJob.sentMailbox
    })
    .from(smtpJob)
    .where(eq(smtpJob.id, id))
    .limit(1)
  if (!job) return error(404, 'Send job not found')

  const [storedCopy] = job.messageId
    ? await db
        .select({ id: mailMessageMailbox.id })
        .from(mailMessageMailbox)
        .where(
          and(
            eq(mailMessageMailbox.messageId, job.messageId),
            eq(mailMessageMailbox.mailbox, job.sentMailbox ?? '')
          )
        )
        .limit(1)
    : []

  return json({
    status: sendStatusFromJobStatus(job.status, job.deliveredAt),
    error: job.deliveredAt ? null : job.lastError,
    openedAt: job.openedAt?.toISOString() ?? null,
    storedMessageId: storedCopy?.id ?? null
  })
}
