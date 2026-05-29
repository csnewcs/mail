import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { deleteSenderRule } from '$lib/server/sender-rules'
import { deleteDemoSenderRule, isDemoModeEnabled } from '$lib/server/demo'

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return error(400, 'Invalid sender rule ID')

  if (isDemoModeEnabled()) {
    deleteDemoSenderRule(id)
    return json({ ok: true })
  }

  await deleteSenderRule(id)
  return json({ ok: true })
}
