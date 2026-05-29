import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { listAuditLogs } from '$lib/server/audit-log'
import { isDemoModeEnabled } from '$lib/server/demo'

export const GET: RequestHandler = async ({ url }) => {
  if (isDemoModeEnabled()) {
    return json({ auditLog: [] })
  }

  const limit = Number(url.searchParams.get('limit') ?? 50)
  return json({ auditLog: await listAuditLogs(Number.isFinite(limit) ? limit : 50) })
}
