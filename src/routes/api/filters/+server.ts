import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailFilter } from '$lib/server/db/schema'
import { logServerEvent } from '$lib/server/perf'
import { asc } from 'drizzle-orm'
import { createDemoFilter, isDemoModeEnabled, listDemoFilters } from '$lib/server/demo'
import { normalizeFilterConditions } from '$lib/filter-conditions'
import { writeAuditLog } from '$lib/server/audit-log'

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) {
    return json({ filters: listDemoFilters() })
  }
  const filters = await db.select().from(mailFilter).orderBy(asc(mailFilter.sortOrder))
  return json({ filters })
}

export const POST: RequestHandler = async (event) => {
  const { request } = event
  const body = await request.json()

  const conditionSet = normalizeFilterConditions(body.conditions, {
    field: String(body.field ?? ''),
    operator: String(body.operator ?? ''),
    value: String(body.value ?? '')
  })
  const firstCondition = conditionSet.conditions[0]

  if (!firstCondition || !body.action) {
    return error(400, 'Missing required fields: conditions, action')
  }

  if (isDemoModeEnabled()) {
    return json({ id: createDemoFilter(body as Record<string, unknown>) })
  }

  const [inserted] = await db
    .insert(mailFilter)
    .values({
      field: firstCondition.field,
      operator: firstCondition.operator,
      value: firstCondition.value,
      conditions: conditionSet,
      action: body.action,
      target: body.target ?? null,
      enabled: body.enabled !== false,
      sortOrder: body.sort_order ?? 0
    })
    .returning({ id: mailFilter.id })

  if (!inserted) {
    logServerEvent('api.filters.POST.insertReturnedEmpty', {
      field: firstCondition.field,
      action: body.action
    })
    return error(500, 'Failed to create filter')
  }

  await writeAuditLog({
    action: 'filter.create',
    entityType: 'filter',
    entityId: inserted.id,
    summary: 'Created mail filter',
    metadata: {
      filter: {
        field: body.field,
        operator: body.operator,
        value: body.value,
        action: body.action,
        target: body.target ?? null,
        enabled: body.enabled !== false,
        sortOrder: body.sort_order ?? 0
      }
    },
    event
  })

  return json({ id: inserted.id })
}
