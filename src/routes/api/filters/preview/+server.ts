import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { previewFilterMatches } from '$lib/server/filters'
import { normalizeFilterConditions } from '$lib/filter-conditions'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async ({ request }) => {
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

  if (isDemoModeEnabled()) return json({ matches: [] })

  const matches = await previewFilterMatches({
    id: 0,
    sortOrder: 0,
    enabled: true,
    field: firstCondition.field,
    operator: firstCondition.operator,
    value: firstCondition.value,
    conditions: conditionSet,
    action: body.action,
    target: body.target ?? null
  })

  return json({ matches })
}
