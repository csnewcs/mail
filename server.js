import { createServer } from 'node:http'
import { WebSocketServer } from 'ws'

process.env.BODY_SIZE_LIMIT ||= '16M'
const { handler } = await import('./build/handler.js')

const host = process.env.HOST || '0.0.0.0'
const port = Number(process.env.PORT || 3000)
const websocketPath = '/api/external/v1/mcp/ws'
const mcpHttpUrl = `http://127.0.0.1:${port}/api/external/v1/mcp`
const authCheckUrl = `http://127.0.0.1:${port}/api/external/v1/auth-check`

const server = createServer(handler)
const sockets = new Set()
const wss = new WebSocketServer({
  noServer: true,
  maxPayload: 16 * 1024 * 1024,
  handleProtocols(protocols) {
    return protocols.has('mcp') ? 'mcp' : false
  }
})

function apiKeyFromUpgrade(request) {
  const authorization = request.headers.authorization ?? ''
  const bearer = authorization.match(/^Bearer\s+(.+)$/i)?.[1]?.trim()
  if (bearer) return bearer
  return (request.headers['sec-websocket-protocol'] ?? '')
    .split(',')
    .map((value) => value.trim())
    .find((value) => value.startsWith('pmail_'))
}

function rejectUpgrade(socket, status, message) {
  socket.write(
    `HTTP/1.1 ${status} ${message}\r\nConnection: close\r\nContent-Type: text/plain\r\nContent-Length: ${Buffer.byteLength(message)}\r\n\r\n${message}`
  )
  socket.destroy()
}

server.on('upgrade', async (request, socket, head) => {
  const pathname = new URL(request.url ?? '/', 'http://localhost').pathname
  if (pathname !== websocketPath) {
    rejectUpgrade(socket, 404, 'Not Found')
    return
  }

  const apiKey = apiKeyFromUpgrade(request)
  if (!apiKey) {
    rejectUpgrade(socket, 401, 'Unauthorized')
    return
  }

  try {
    const response = await fetch(authCheckUrl, {
      headers: { authorization: `Bearer ${apiKey}` }
    })
    if (!response.ok) {
      rejectUpgrade(socket, 401, 'Unauthorized')
      return
    }
  } catch {
    rejectUpgrade(socket, 503, 'Service Unavailable')
    return
  }

  wss.handleUpgrade(request, socket, head, (websocket) => {
    wss.emit('connection', websocket, request, apiKey)
  })
})

wss.on('connection', (websocket, _request, apiKey) => {
  sockets.add(websocket)
  websocket.on('close', () => sockets.delete(websocket))
  websocket.on('message', async (data, isBinary) => {
    if (isBinary) {
      websocket.close(1003, 'JSON messages required')
      return
    }
    try {
      const request = JSON.parse(data.toString())
      const response = await fetch(mcpHttpUrl, {
        method: 'POST',
        headers: {
          authorization: `Bearer ${apiKey}`,
          'content-type': 'application/json'
        },
        body: data.toString()
      })
      if (response.status === 202) return
      if (response.status === 401 || response.status === 403) {
        websocket.close(1008, 'API key is no longer authorized')
        return
      }
      if (!response.ok) {
        websocket.send(
          JSON.stringify({
            jsonrpc: '2.0',
            id: request?.id ?? null,
            error: {
              code: response.status === 429 ? -32029 : -32000,
              message: response.status === 429 ? 'Rate limit exceeded' : 'MCP request failed'
            }
          })
        )
        return
      }
      websocket.send(await response.text())
    } catch {
      websocket.send(
        JSON.stringify({
          jsonrpc: '2.0',
          id: null,
          error: { code: -32603, message: 'Internal error' }
        })
      )
    }
  })
})

server.listen(port, host, () => {
  console.log(`[web] listening on ${host}:${port}`)
})

function shutdown() {
  for (const socket of sockets) socket.close(1001, 'Server shutting down')
  server.close(() => process.exit(0))
  setTimeout(() => process.exit(1), 30_000).unref()
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
