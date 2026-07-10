import type { PageServerLoad } from './$types'
import { listAuditLogs } from '$lib/server/audit-log'

export const load: PageServerLoad = async () => {
  const logs = await listAuditLogs(100)

  return {
    logs: logs.map((log) => ({
      id: log.id,
      action: log.action,
      entityType: log.entityType,
      entityId: log.entityId,
      summary: log.summary,
      metadata: log.metadata,
      actorEmail: log.actorEmail,
      ipAddress: log.ipAddress,
      userAgent: log.userAgent,
      createdAt: log.createdAt.toISOString()
    }))
  }
}
