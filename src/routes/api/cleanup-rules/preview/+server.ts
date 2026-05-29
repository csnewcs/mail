import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { previewCleanupRule } from '$lib/server/cleanup-rules'

export const POST: RequestHandler = async ({ request }) => {
  try {
    const matches = await previewCleanupRule(await request.json())
    return json({ matches })
  } catch (err) {
    return error(400, err instanceof Error ? err.message : 'Invalid cleanup rule')
  }
}
