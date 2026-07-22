import { and, eq, isNotNull, isNull } from 'drizzle-orm'
import type { RequestHandler } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import { db } from '$lib/server/db'
import { smtpJob } from '$lib/server/db/schema'
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
      await db
        .update(smtpJob)
        .set({ openedAt: new Date() })
        .where(
          and(
            eq(smtpJob.trackingToken, params.token),
            isNotNull(smtpJob.deliveredAt),
            isNull(smtpJob.openedAt)
          )
        )
    } catch (error) {
      logServerError('emailTracking.open', error)
    }
  }

  return emailTrackingPixelResponse()
}

export const HEAD: RequestHandler = () => emailTrackingPixelResponse()
