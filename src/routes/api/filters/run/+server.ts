import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { runFiltersOnExistingMessages } from '$lib/server/filters'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json({ ok: true, scanned: 0 })

  const scanned = await runFiltersOnExistingMessages()
  return json({ ok: true, scanned })
}
