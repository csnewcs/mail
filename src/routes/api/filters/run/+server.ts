import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { runFiltersOnExistingMessages } from '$lib/server/filters'

export const POST: RequestHandler = async () => {
  const scanned = await runFiltersOnExistingMessages()
  return json({ ok: true, scanned })
}
