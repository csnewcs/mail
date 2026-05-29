import type { RequestEvent } from '@sveltejs/kit'
import { desc } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailAuditLog } from '$lib/server/db/schema'

type AuditMetadata = Record<string, unknown>

type AuditEvent = {
  action: string
  entityType: string
  entityId?: string | number | null
  summary: string
  metadata?: AuditMetadata
  event?: Pick<RequestEvent, 'locals' | 'request' | 'getClientAddress'>
}

const SECRET_KEY_RE = /(password|secret|token|private.?key|credential|auth|p256dh)/i

export function redactAuditMetadata(value: unknown): unknown {
  if (Array.isArray(value)) return value.map((item) => redactAuditMetadata(item))

  if (!value || typeof value !== 'object') return value

  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, entry]) => [
      key,
      SECRET_KEY_RE.test(key) ? '[redacted]' : redactAuditMetadata(entry)
    ])
  )
}

export async function writeAuditLog({
  action,
  entityType,
  entityId,
  summary,
  metadata = {},
  event
}: AuditEvent): Promise<void> {
  const actor = event?.locals.user
  const headers = event?.request.headers

  await db.insert(mailAuditLog).values({
    action,
    entityType,
    entityId: entityId == null ? null : String(entityId),
    summary,
    metadata: JSON.stringify(redactAuditMetadata(metadata)),
    actorUserId: actor?.id ?? null,
    actorEmail: actor?.email ?? null,
    ipAddress: headers?.get('x-forwarded-for')?.split(',')[0]?.trim() || safeClientAddress(event),
    userAgent: headers?.get('user-agent') ?? null
  })
}

export async function listAuditLogs(limit = 50) {
  return db
    .select()
    .from(mailAuditLog)
    .orderBy(desc(mailAuditLog.createdAt))
    .limit(Math.max(1, Math.min(limit, 100)))
}

function safeClientAddress(event: AuditEvent['event']): string | null {
  if (!event) return null
  try {
    return event.getClientAddress()
  } catch {
    return null
  }
}
