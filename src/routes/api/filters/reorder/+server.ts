import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailFilter } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'
import { isDemoModeEnabled, reorderDemoFilters } from '$lib/server/demo'
import { writeAuditLog } from '$lib/server/audit-log'

export const POST: RequestHandler = async (event) => {
  const { request } = event
  const body = await request.json()
  const ids = body.ids as number[]

  if (!Array.isArray(ids)) return error(400, 'ids must be an array')

  if (isDemoModeEnabled()) {
    reorderDemoFilters(ids)
    return json({ ok: true })
  }

  for (let i = 0; i < ids.length; i++) {
    await db.update(mailFilter).set({ sortOrder: i }).where(eq(mailFilter.id, ids[i]))
  }

  await writeAuditLog({
    action: 'filter.reorder',
    entityType: 'filter',
    summary: 'Reordered mail filters',
    metadata: { ids },
    event
  })

  return json({ ok: true })
}
