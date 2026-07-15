import { and, eq } from 'drizzle-orm'
import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { account, passkey } from '$lib/server/db/schema'
import { getLoginMethods } from '$lib/server/auth-methods'
import { writeAuditLog } from '$lib/server/audit-log'

export const DELETE: RequestHandler = async (event) => {
  const userId = event.locals.user?.id
  if (!userId) return error(401, 'Authentication required')

  const userPasskeys = await db
    .select({ id: passkey.id })
    .from(passkey)
    .where(eq(passkey.userId, userId))
  if (!userPasskeys.some((item) => item.id === event.params.id)) {
    return error(404, 'Passkey not found')
  }

  if (userPasskeys.length === 1) {
    const methods = await getLoginMethods()
    const linkedAccounts = await db
      .select({ providerId: account.providerId })
      .from(account)
      .where(eq(account.userId, userId))
    const linkedProviderIds = new Set(linkedAccounts.map((linked) => linked.providerId))
    const hasLinkedExternalProvider =
      (methods.github && linkedProviderIds.has('github')) ||
      (methods.discord && linkedProviderIds.has('discord')) ||
      (methods.oidc && linkedProviderIds.has('oidc'))
    if (!methods.password && !hasLinkedExternalProvider) {
      return error(400, 'Add another login method before removing your last passkey.')
    }
  }

  await db.delete(passkey).where(and(eq(passkey.id, event.params.id), eq(passkey.userId, userId)))
  await writeAuditLog({
    action: 'security.passkey.delete',
    entityType: 'account',
    entityId: userId,
    summary: 'Removed a passkey',
    event
  })
  return json({ success: true })
}
