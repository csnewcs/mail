import { randomUUID } from 'node:crypto'

type Session = {
  apiKeyId: string
  send: (payload: unknown) => void
  close: () => void
}

const sessions = new Map<string, Session>()

export function createMcpSseSession(apiKeyId: string, signal: AbortSignal) {
  const id = randomUUID()
  const encoder = new TextEncoder()
  let heartbeat: ReturnType<typeof setInterval> | null = null

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const write = (value: string) => controller.enqueue(encoder.encode(value))
      const close = () => {
        if (heartbeat) clearInterval(heartbeat)
        sessions.delete(id)
        try {
          controller.close()
        } catch {
          // The client may already have disconnected.
        }
      }
      sessions.set(id, {
        apiKeyId,
        send: (payload) => write(`event: message\ndata: ${JSON.stringify(payload)}\n\n`),
        close
      })
      write(`event: endpoint\ndata: /api/external/v1/mcp/messages?sessionId=${id}\n\n`)
      heartbeat = setInterval(() => write(': keepalive\n\n'), 15_000)
      signal.addEventListener('abort', close, { once: true })
    },
    cancel() {
      sessions.get(id)?.close()
    }
  })
  return stream
}

export function getMcpSseSession(id: string, apiKeyId: string) {
  const session = sessions.get(id)
  return session?.apiKeyId === apiKeyId ? session : null
}
