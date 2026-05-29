import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { runCleanupRules } from '$lib/server/cleanup-rules'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json({ ok: true, archived: 0 })

  const archived = await runCleanupRules()
  return json({ ok: true, archived })
}
