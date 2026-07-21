import {
  ExternalApiError,
  getExternalMessage,
  listExternalMessages,
  sendExternalMessage
} from './external-mail'
import { logServerError } from './perf'
import { checkApiSendRateLimit } from './api-rate-limit'

type JsonRpcRequest = {
  jsonrpc?: unknown
  id?: unknown
  method?: unknown
  params?: unknown
}

function result(id: unknown, value: unknown) {
  return { jsonrpc: '2.0', id: id ?? null, result: value }
}

function failure(id: unknown, code: number, message: string) {
  return { jsonrpc: '2.0', id: id ?? null, error: { code, message } }
}

const tools = [
  {
    name: 'list_messages',
    description: 'List or search received email messages.',
    inputSchema: {
      type: 'object',
      properties: {
        mailbox: { type: 'string', description: 'Mailbox slug or path. Defaults to inbox.' },
        query: { type: 'string', description: 'Optional full-text mail search query.' },
        unread: { type: 'boolean' },
        limit: { type: 'integer', minimum: 1, maximum: 100 },
        offset: { type: 'integer', minimum: 0 }
      },
      additionalProperties: false
    }
  },
  {
    name: 'get_message',
    description: 'Get one received message and its attachment metadata.',
    inputSchema: {
      type: 'object',
      properties: { id: { type: ['integer', 'string'] } },
      required: ['id'],
      additionalProperties: false
    }
  },
  {
    name: 'send_message',
    description: 'Schedule an email message for background sending.',
    inputSchema: {
      type: 'object',
      properties: {
        to: { type: 'string' },
        cc: { type: 'string' },
        bcc: { type: 'string' },
        subject: { type: 'string' },
        html: { type: 'string' },
        inReplyTo: { type: 'string' },
        smtpServerId: { type: 'string' },
        fromName: { type: 'string' },
        sendAt: { type: 'string', format: 'date-time' },
        attachments: { type: 'array', items: { type: 'object' } }
      },
      required: ['to', 'subject'],
      additionalProperties: false
    }
  }
]

async function callTool(name: string, input: Record<string, unknown>, apiKeyId?: string) {
  if (name === 'list_messages') {
    const url = new URL('http://mcp.local/messages')
    if (typeof input.mailbox === 'string') url.searchParams.set('mailbox', input.mailbox)
    if (typeof input.query === 'string') url.searchParams.set('q', input.query)
    if (input.unread === true) url.searchParams.set('unread', '1')
    if (typeof input.limit === 'number') url.searchParams.set('limit', String(input.limit))
    if (typeof input.offset === 'number') url.searchParams.set('offset', String(input.offset))
    return listExternalMessages(url)
  }
  if (name === 'get_message') return getExternalMessage(String(input.id ?? ''))
  if (name === 'send_message') {
    if (apiKeyId && !checkApiSendRateLimit(apiKeyId)) {
      throw new ExternalApiError(429, 'Send rate limit exceeded')
    }
    return sendExternalMessage(input)
  }
  throw new Error(`Unknown tool: ${name}`)
}

export async function handleMcpRequest(input: unknown, apiKeyId?: string) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    return failure(null, -32600, 'Invalid Request')
  }
  const request = input as JsonRpcRequest
  if (
    request.jsonrpc === '2.0' &&
    typeof request.method !== 'string' &&
    ('result' in request || 'error' in request)
  ) {
    return null
  }
  if (request.jsonrpc !== '2.0' || typeof request.method !== 'string') {
    return failure(request.id, -32600, 'Invalid Request')
  }
  const isNotification = !Object.prototype.hasOwnProperty.call(request, 'id')
  const respond = (value: unknown) => (isNotification ? null : result(request.id, value))

  if (request.method === 'initialize') {
    return respond({
      protocolVersion: '2025-06-18',
      capabilities: { tools: { listChanged: false } },
      serverInfo: { name: 'mail', version: '1.0.0' }
    })
  }
  if (request.method === 'ping') return respond({})
  if (request.method === 'tools/list') return respond({ tools })
  if (request.method.startsWith('notifications/')) return null
  if (request.method === 'tools/call') {
    const params = request.params as { name?: unknown; arguments?: unknown } | undefined
    if (typeof params?.name !== 'string')
      return failure(request.id, -32602, 'Tool name is required')
    const args =
      params.arguments && typeof params.arguments === 'object' && !Array.isArray(params.arguments)
        ? (params.arguments as Record<string, unknown>)
        : {}
    try {
      const value = await callTool(params.name, args, apiKeyId)
      return respond({
        content: [{ type: 'text', text: JSON.stringify(value, null, 2) }],
        structuredContent: value
      })
    } catch (error) {
      if (!(error instanceof ExternalApiError)) {
        logServerError('mcp.tool', error, { tool: params.name })
      }
      return respond({
        isError: true,
        content: [
          {
            type: 'text',
            text:
              error instanceof ExternalApiError ? error.message : 'The tool could not be completed.'
          }
        ]
      })
    }
  }
  if (isNotification) return null
  return failure(request.id, -32601, 'Method not found')
}
