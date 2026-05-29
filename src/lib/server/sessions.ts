import { and, desc, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { session } from '$lib/server/db/schema'

export type ManagedSession = {
  id: string
  createdAt: string
  updatedAt: string
  expiresAt: string
  ipAddress: string | null
  userAgent: string | null
  deviceLabel: string
  isCurrent: boolean
}

function deviceLabelFromUserAgent(userAgent: string | null) {
  if (!userAgent) return 'Unknown device'

  const os = userAgent.includes('Windows')
    ? 'Windows'
    : userAgent.includes('Mac OS X') || userAgent.includes('Macintosh')
      ? 'macOS'
      : userAgent.includes('Android')
        ? 'Android'
        : userAgent.includes('iPhone') || userAgent.includes('iPad')
          ? 'iOS'
          : userAgent.includes('Linux')
            ? 'Linux'
            : 'Unknown OS'

  const browser = userAgent.includes('Firefox/')
    ? 'Firefox'
    : userAgent.includes('Edg/')
      ? 'Edge'
      : userAgent.includes('Chrome/') || userAgent.includes('CriOS/')
        ? 'Chrome'
        : userAgent.includes('Safari/')
          ? 'Safari'
          : 'Unknown browser'

  return `${browser} on ${os}`
}

export async function listManagedSessions(userId: string, currentSessionId: string | null) {
  const rows = await db
    .select({
      id: session.id,
      createdAt: session.createdAt,
      updatedAt: session.updatedAt,
      expiresAt: session.expiresAt,
      ipAddress: session.ipAddress,
      userAgent: session.userAgent
    })
    .from(session)
    .where(eq(session.userId, userId))
    .orderBy(desc(session.updatedAt))

  return rows.map((row): ManagedSession => {
    const userAgent = row.userAgent ?? null
    return {
      id: row.id,
      createdAt: row.createdAt.toISOString(),
      updatedAt: row.updatedAt.toISOString(),
      expiresAt: row.expiresAt.toISOString(),
      ipAddress: row.ipAddress ?? null,
      userAgent,
      deviceLabel: deviceLabelFromUserAgent(userAgent),
      isCurrent: row.id === currentSessionId
    }
  })
}

export async function revokeManagedSession(userId: string, sessionId: string) {
  const deleted = await db
    .delete(session)
    .where(and(eq(session.id, sessionId), eq(session.userId, userId)))
    .returning({ id: session.id })

  return deleted.length > 0
}
