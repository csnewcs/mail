import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailFilter } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'
import { deleteDemoFilter, isDemoModeEnabled, updateDemoFilter } from '$lib/server/demo'
import { normalizeFilterConditions } from '$lib/filter-conditions'
import { writeAuditLog } from '$lib/server/audit-log'

export const PUT: RequestHandler = async (event) => {
  const { params, request } = event
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid filter ID')

  const body = await request.json()

  if (isDemoModeEnabled()) {
    updateDemoFilter(id, body as Record<string, unknown>)
    return json({ ok: true })
  }

  const updates: Partial<typeof mailFilter.$inferInsert> = {}

  if (body.conditions !== undefined) {
    const conditionSet = normalizeFilterConditions(body.conditions, {
      field: String(body.field ?? ''),
      operator: String(body.operator ?? ''),
      value: String(body.value ?? '')
    })
    const firstCondition = conditionSet.conditions[0]
    if (firstCondition) {
      updates.field = firstCondition.field
      updates.operator = firstCondition.operator
      updates.value = firstCondition.value
      updates.conditions = conditionSet
    }
  } else {
    if (typeof body.field === 'string') updates.field = body.field
    if (typeof body.operator === 'string') updates.operator = body.operator
    if (typeof body.value === 'string') updates.value = body.value
  }
  if (typeof body.action === 'string') updates.action = body.action
  if (body.target !== undefined) updates.target = body.target
  if (typeof body.enabled === 'boolean') updates.enabled = body.enabled
  if (typeof body.sort_order === 'number') updates.sortOrder = body.sort_order

  await db.update(mailFilter).set(updates).where(eq(mailFilter.id, id))
  await writeAuditLog({
    action: 'filter.update',
    entityType: 'filter',
    entityId: id,
    summary: 'Updated mail filter',
    metadata: { updates },
    event
  })
  return json({ ok: true })
}

export const DELETE: RequestHandler = async (event) => {
  const { params } = event
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid filter ID')

  if (isDemoModeEnabled()) {
    deleteDemoFilter(id)
    return json({ ok: true })
  }

  await db.delete(mailFilter).where(eq(mailFilter.id, id))
  await writeAuditLog({
    action: 'filter.delete',
    entityType: 'filter',
    entityId: id,
    summary: 'Deleted mail filter',
    event
  })
  return json({ ok: true })
}
