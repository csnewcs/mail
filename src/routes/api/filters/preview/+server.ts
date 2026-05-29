import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { previewFilterMatches } from '$lib/server/filters'

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  if (!body.field || !body.operator || !body.value || !body.action) {
    return error(400, 'Missing required fields: field, operator, value, action')
  }

  const matches = await previewFilterMatches({
    id: 0,
    sortOrder: 0,
    enabled: true,
    field: body.field,
    operator: body.operator,
    value: body.value,
    action: body.action,
    target: body.target ?? null
  })

  return json({ matches })
}
