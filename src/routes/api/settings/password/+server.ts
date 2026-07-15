import { and, eq, inArray } from 'drizzle-orm'
import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getAuth } from '$lib/server/auth'
import { db } from '$lib/server/db'
import { account } from '$lib/server/db/schema'
import { writeAuditLog } from '$lib/server/audit-log'

export const POST: RequestHandler = async (event) => {
  if (!event.locals.user) return error(401, 'Authentication required')

  const body = (await event.request.json()) as Record<string, unknown>
  const currentPassword = typeof body.currentPassword === 'string' ? body.currentPassword : ''
  const newPassword = typeof body.newPassword === 'string' ? body.newPassword : ''
  if (newPassword.length < 8 || newPassword.length > 128) {
    return error(400, 'The new password must be between 8 and 128 characters.')
  }

  const [credential] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.userId, event.locals.user.id),
        inArray(account.providerId, ['credential', 'email-password'])
      )
    )
    .limit(1)

  const auth = await getAuth()
  if (credential) {
    if (!currentPassword) return error(400, 'Current password is required.')
    await auth.api.changePassword({
      body: { currentPassword, newPassword, revokeOtherSessions: false },
      headers: event.request.headers
    })
  } else {
    await auth.api.setPassword({
      body: { newPassword },
      headers: event.request.headers
    })
  }

  await writeAuditLog({
    action: credential ? 'security.password.change' : 'security.password.set',
    entityType: 'account',
    entityId: event.locals.user.id,
    summary: credential ? 'Changed login password' : 'Enabled password login',
    event
  })

  return json({ success: true, hasPassword: true })
}
