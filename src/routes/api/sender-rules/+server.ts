import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { addSenderRule, isSenderRuleType, listSenderRules } from '$lib/server/sender-rules'
import { createDemoSenderRule, isDemoModeEnabled, listDemoSenderRules } from '$lib/server/demo'

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) {
    return json({ rules: listDemoSenderRules() })
  }

  const rules = await listSenderRules()
  return json({ rules })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  const sender = typeof body.sender === 'string' ? body.sender.trim() : ''

  if (!isSenderRuleType(body.type)) {
    return error(400, 'type must be block or allow')
  }

  if (!sender) {
    return error(400, 'sender is required')
  }

  if (isDemoModeEnabled()) {
    const id = createDemoSenderRule(body as Record<string, unknown>)
    if (!id) return error(400, 'sender is required')
    return json({ id })
  }

  const id = await addSenderRule(body.type, sender)
  if (!id) return error(400, 'sender is required')

  return json({ id })
}
