import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { handleMcpRequest } from '$lib/server/mcp'

const PROTOCOL_VERSION = '2025-06-18'

export const POST: RequestHandler = async ({ locals, request, url }) => {
  const origin = request.headers.get('origin')
  if (origin && origin !== url.origin) {
    return json({ error: 'Invalid Origin header' }, { status: 403 })
  }
  const protocolVersion = request.headers.get('mcp-protocol-version')
  if (protocolVersion && protocolVersion !== PROTOCOL_VERSION) {
    return json({ error: 'Unsupported MCP protocol version' }, { status: 400 })
  }
  const accept = request.headers.get('accept') ?? '*/*'
  if (!accept.includes('*/*') && !accept.includes('application/json')) {
    return json({ error: 'Accept must include application/json' }, { status: 406 })
  }
  const payload = await request.json().catch(() => null)
  const response = await handleMcpRequest(payload, locals.apiKey?.id)
  return response === null ? new Response(null, { status: 202 }) : json(response)
}
