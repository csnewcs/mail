import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailCleanupRule } from '$lib/server/db/schema'
import { normalizeCleanupRuleInput } from '$lib/server/cleanup-rules'
import { isDemoModeEnabled } from '$lib/server/demo'

export const PUT: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id)) return error(400, 'Invalid cleanup rule id')

  const body = await request.json()
  const patch: Partial<typeof mailCleanupRule.$inferInsert> = { updatedAt: new Date() }

  try {
    if ('enabled' in body && Object.keys(body).length === 1) {
      patch.enabled = body.enabled !== false
    } else {
      Object.assign(patch, normalizeCleanupRuleInput(body))
    }
  } catch (err) {
    return error(400, err instanceof Error ? err.message : 'Invalid cleanup rule')
  }

  if (isDemoModeEnabled()) return json({ ok: true })

  await db.update(mailCleanupRule).set(patch).where(eq(mailCleanupRule.id, id))
  return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id)) return error(400, 'Invalid cleanup rule id')

  if (isDemoModeEnabled()) return json({ ok: true })

  await db.delete(mailCleanupRule).where(eq(mailCleanupRule.id, id))
  return json({ ok: true })
}
