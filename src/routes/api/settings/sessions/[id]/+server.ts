import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import { revokeManagedSession } from '$lib/server/sessions'

export const DELETE: RequestHandler = async ({ locals, params, request }) => {
  if (!locals.user || !locals.session) return error(401, 'Not authenticated')

  const isCurrent = params.id === locals.session.id
  let confirmCurrentSession = false

  if (isCurrent) {
    const contentType = request.headers.get('content-type') ?? ''
    if (contentType.includes('application/json')) {
      const body = (await request.json().catch(() => null)) as Record<string, unknown> | null
      confirmCurrentSession = body?.confirmCurrentSession === true
    }
  }

  if (isCurrent && !confirmCurrentSession) {
    return error(409, 'Revoking your current session requires confirmation')
  }

  if (isDemoModeEnabled()) {
    return json({ ok: true, revoked: !isCurrent, currentSessionRevoked: false })
  }

  const revoked = await revokeManagedSession(locals.user.id, params.id)
  if (!revoked) return error(404, 'Session not found')

  return json({ ok: true, revoked, currentSessionRevoked: isCurrent })
}
