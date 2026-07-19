import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { revokeApiKey } from '$lib/server/api-keys'
import { isDemoModeEnabled } from '$lib/server/demo'
import { writeAuditLog } from '$lib/server/audit-log'

export const DELETE: RequestHandler = async (event) => {
  const { locals, params } = event
  if (!locals.user || !locals.session) return error(401, 'Not authenticated')
  if (isDemoModeEnabled()) return error(403, 'API keys are disabled in demo mode')
  if (!(await revokeApiKey(locals.user.id, params.id))) return error(404, 'API key not found')

  await writeAuditLog({
    action: 'security.api_key.revoke',
    entityType: 'api_key',
    entityId: params.id,
    summary: 'Revoked external API key',
    event
  })
  return json({ ok: true })
}
