import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { runCleanupRules } from '$lib/server/cleanup-rules'

export const POST: RequestHandler = async () => {
  const archived = await runCleanupRules()
  return json({ ok: true, archived })
}
