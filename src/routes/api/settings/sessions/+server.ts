import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDemoAuthSession, isDemoModeEnabled } from '$lib/server/demo'
import { listManagedSessions } from '$lib/server/sessions'

export const GET: RequestHandler = async ({ locals }) => {
  if (isDemoModeEnabled()) {
    const demo = getDemoAuthSession()
    return json({
      sessions: [
        {
          id: demo.session.id,
          createdAt: demo.session.createdAt.toISOString(),
          updatedAt: demo.session.updatedAt.toISOString(),
          expiresAt: demo.session.expiresAt.toISOString(),
          ipAddress: null,
          userAgent: null,
          deviceLabel: 'Demo browser session',
          isCurrent: true
        }
      ]
    })
  }

  if (!locals.user) return error(401, 'Not authenticated')

  return json({
    sessions: await listManagedSessions(locals.user.id, locals.session?.id ?? null)
  })
}
