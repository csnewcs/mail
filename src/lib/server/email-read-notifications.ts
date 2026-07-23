import { and, eq, isNotNull, isNull, lte, or, sql } from 'drizzle-orm'
import { pathToSlug } from '../mailbox'
import { db } from './db'
import { mailMessageMailbox, smtpJob } from './db/schema'
import { emailReadNotification, emailReadNotificationRetryDelay } from './email-tracking'
import { logServerError } from './perf'
import { sendPushToAll } from './push'

const CLAIM_TIMEOUT_MS = 5 * 60_000
async function claimEmailReadNotification(id: number) {
  const now = new Date()
  const staleClaim = new Date(now.getTime() - CLAIM_TIMEOUT_MS)
  const [job] = await db
    .update(smtpJob)
    .set({ readNotificationClaimedAt: now })
    .where(
      and(
        eq(smtpJob.id, id),
        isNotNull(smtpJob.openedAt),
        isNull(smtpJob.readNotificationSentAt),
        lte(smtpJob.readNotificationAvailableAt, now),
        or(
          isNull(smtpJob.readNotificationClaimedAt),
          lte(smtpJob.readNotificationClaimedAt, staleClaim)
        )
      )
    )
    .returning({
      id: smtpJob.id,
      payload: smtpJob.payload,
      messageId: smtpJob.messageId,
      sentMailbox: smtpJob.sentMailbox,
      attemptCount: smtpJob.readNotificationAttemptCount
    })
  return job ? { ...job, claimedAt: now } : null
}

async function rescheduleEmailReadNotification(
  id: number,
  claimedAt: Date,
  previousAttemptCount: number
) {
  const attemptCount = previousAttemptCount + 1
  const [rescheduled] = await db
    .update(smtpJob)
    .set({
      readNotificationAttemptCount: sql`${smtpJob.readNotificationAttemptCount} + 1`,
      readNotificationAvailableAt: new Date(
        Date.now() + emailReadNotificationRetryDelay(attemptCount)
      ),
      readNotificationClaimedAt: null
    })
    .where(
      and(
        eq(smtpJob.id, id),
        eq(smtpJob.readNotificationClaimedAt, claimedAt),
        isNull(smtpJob.readNotificationSentAt)
      )
    )
    .returning({ id: smtpJob.id })
  return rescheduled ? attemptCount : null
}

export async function dispatchEmailReadNotification(id: number) {
  const job = await claimEmailReadNotification(id)
  if (!job) return false

  try {
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
    const url = job.sentMailbox
      ? `/${pathToSlug(job.sentMailbox)}/${storedCopy?.id ?? -job.id}`
      : '/'
    const delivered = await sendPushToAll(emailReadNotification(job.payload, url, job.id))
    if (!delivered) {
      await rescheduleEmailReadNotification(job.id, job.claimedAt, job.attemptCount)
      return false
    }

    const [completed] = await db
      .update(smtpJob)
      .set({ readNotificationSentAt: new Date(), readNotificationClaimedAt: null })
      .where(
        and(
          eq(smtpJob.id, job.id),
          eq(smtpJob.readNotificationClaimedAt, job.claimedAt),
          isNull(smtpJob.readNotificationSentAt)
        )
      )
      .returning({ id: smtpJob.id })
    return Boolean(completed)
  } catch (error) {
    const attemptCount = await rescheduleEmailReadNotification(
      job.id,
      job.claimedAt,
      job.attemptCount
    )
    if (attemptCount !== null) {
      logServerError('emailTracking.notify', error, { jobId: job.id, attemptCount })
    }
    return false
  }
}

export async function dispatchPendingEmailReadNotifications() {
  const pending = await db
    .select({ id: smtpJob.id })
    .from(smtpJob)
    .where(
      and(
        isNotNull(smtpJob.openedAt),
        isNull(smtpJob.readNotificationSentAt),
        lte(smtpJob.readNotificationAvailableAt, new Date())
      )
    )
    .limit(20)
  await Promise.all(pending.map((job) => dispatchEmailReadNotification(job.id)))
  return pending.length
}
