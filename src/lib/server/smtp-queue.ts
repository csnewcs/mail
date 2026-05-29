import type { ComposerAttachment } from '$lib/mail-attachments'
import { db } from './db'
import { smtpJob } from './db/schema'

export type SmtpSendJobPayload = {
  to: string
  cc?: string | null
  bcc?: string | null
  subject: string
  html?: string | null
  inReplyTo?: string | null
  attachments: ComposerAttachment[]
}

export async function enqueueSmtpSendJob(payload: SmtpSendJobPayload, availableAt = new Date()) {
  const now = new Date()
  const [job] = await db
    .insert(smtpJob)
    .values({
      payload: JSON.stringify(payload),
      status: 'pending',
      attemptCount: 0,
      availableAt,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })
    .returning({ id: smtpJob.id })

  return job?.id ?? null
}
