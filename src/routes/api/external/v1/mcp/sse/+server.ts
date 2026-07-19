import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { createMcpSseSession } from '$lib/server/mcp-sse'

export const GET: RequestHandler = async ({ locals, request, url }) => {
  if (!locals.apiKey) error(401, 'API key required')
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) error(403, 'Invalid Origin header')
  return new Response(createMcpSseSession(locals.apiKey.id, request.signal), {
    headers: {
      'content-type': 'text/event-stream',
      'cache-control': 'no-cache, no-transform',
      connection: 'keep-alive',
      'x-accel-buffering': 'no'
    }
  })
}
