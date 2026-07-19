import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createApiKey, listApiKeys } from '$lib/server/api-keys'
import { isDemoModeEnabled } from '$lib/server/demo'
import { writeAuditLog } from '$lib/server/audit-log'

export const GET: RequestHandler = async ({ locals }) => {
  if (!locals.user || !locals.session) return error(401, 'Not authenticated')
  if (isDemoModeEnabled()) return json({ apiKeys: [] })
  return json({ apiKeys: await listApiKeys(locals.user.id) })
}

export const POST: RequestHandler = async (event) => {
  const { locals, request } = event
  if (!locals.user || !locals.session) return error(401, 'Not authenticated')
  if (isDemoModeEnabled()) return error(403, 'API keys are disabled in demo mode')

  const body = (await request.json().catch(() => null)) as { name?: unknown } | null
  const name = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!name || name.length > 80) return error(400, 'Name must be between 1 and 80 characters')

  const apiKey = await createApiKey(locals.user.id, name)
  await writeAuditLog({
    action: 'security.api_key.create',
    entityType: 'api_key',
    entityId: apiKey.id,
    summary: 'Created external API key',
    metadata: { name: apiKey.name, prefix: apiKey.prefix },
    event
  })
  return json({ apiKey }, { status: 201 })
}
