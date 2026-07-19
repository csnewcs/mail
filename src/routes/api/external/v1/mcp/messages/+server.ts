import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getMcpSseSession } from '$lib/server/mcp-sse'
import { handleMcpRequest } from '$lib/server/mcp'

export const POST: RequestHandler = async ({ locals, request, url }) => {
  const sessionId = url.searchParams.get('sessionId') ?? ''
  const session = locals.apiKey ? getMcpSseSession(sessionId, locals.apiKey.id) : null
  if (!session) return json({ error: 'MCP SSE session not found' }, { status: 404 })
  const response = await handleMcpRequest(await request.json().catch(() => null), locals.apiKey?.id)
  if (response !== null) session.send(response)
  return new Response(null, { status: 202 })
}
