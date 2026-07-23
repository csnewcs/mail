import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import type { RequestHandler } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import { db } from '$lib/server/db'
import { smtpJob } from '$lib/server/db/schema'
import { dispatchEmailReadNotification } from '$lib/server/email-read-notifications'
import { logServerError } from '$lib/server/perf'
import {
  emailTrackingPixelResponse,
  isEmailTrackingToken,
  shouldRecordEmailOpen
} from '$lib/server/email-tracking'

export const GET: RequestHandler = async ({ params, request }) => {
  if (
    !isDemoModeEnabled() &&
    isEmailTrackingToken(params.token) &&
    shouldRecordEmailOpen(request)
  ) {
    try {
      const openedAt = new Date()
      const [openedJob] = await db
        .update(smtpJob)
        .set({ openedAt, readNotificationAvailableAt: openedAt })
        .where(
          and(
            eq(smtpJob.trackingToken, params.token),
            isNotNull(smtpJob.deliveredAt),
            isNull(smtpJob.openedAt)
          )
        )
        .returning({
          id: smtpJob.id
        })

      if (openedJob) await dispatchEmailReadNotification(openedJob.id)
    } catch (error) {
      logServerError('emailTracking.open', error)
    }
  }

  return emailTrackingPixelResponse()
}

export const HEAD: RequestHandler = () => emailTrackingPixelResponse()
