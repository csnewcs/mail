import { createConnection, createServer, type Socket } from 'node:net'

type ImapProxyTarget = { host: string; port: number }
type ImapProxyOptions = {
  maxConnections?: number
  targetTimeoutMs?: number
  connectTimeoutMs?: number
  idleTimeoutMs?: number
}

const DEFAULT_MAX_CONNECTIONS = 100
const DEFAULT_TARGET_TIMEOUT_MS = 10_000
const DEFAULT_CONNECT_TIMEOUT_MS = 15_000
const DEFAULT_IDLE_TIMEOUT_MS = 5 * 60_000

async function resolveWithTimeout(
  resolveTarget: () => Promise<ImapProxyTarget>,
  timeoutMs: number
) {
  let timeout: ReturnType<typeof setTimeout> | undefined
  try {
    return await Promise.race([
      resolveTarget(),
      new Promise<never>((_, reject) => {
        timeout = setTimeout(() => reject(new Error('IMAP target lookup timed out')), timeoutMs)
      })
    ])
  } finally {
    if (timeout) clearTimeout(timeout)
  }
}

export function createImapProxyServer(
  resolveTarget: () => Promise<ImapProxyTarget>,
  activeSockets = new Set<Socket>(),
  options: ImapProxyOptions = {}
) {
  const targetTimeoutMs = options.targetTimeoutMs ?? DEFAULT_TARGET_TIMEOUT_MS
  const connectTimeoutMs = options.connectTimeoutMs ?? DEFAULT_CONNECT_TIMEOUT_MS
  const idleTimeoutMs = options.idleTimeoutMs ?? DEFAULT_IDLE_TIMEOUT_MS
  const proxy = createServer(async (client) => {
    let upstream: Socket | null = null
    activeSockets.add(client)
    client.setTimeout(idleTimeoutMs, () => client.destroy())
    client.once('error', () => upstream?.destroy())
    client.once('close', () => {
      activeSockets.delete(client)
      upstream?.destroy()
    })
    client.pause()

    try {
      const target = await resolveWithTimeout(resolveTarget, targetTimeoutMs)
      if (client.destroyed) return

      const targetSocket = createConnection(target)
      upstream = targetSocket
      activeSockets.add(targetSocket)
      targetSocket.once('close', () => activeSockets.delete(targetSocket))
      targetSocket.setTimeout(connectTimeoutMs, () => targetSocket.destroy())
      targetSocket.once('connect', () => {
        targetSocket.setTimeout(idleTimeoutMs, () => targetSocket.destroy())
        client.pipe(targetSocket)
        targetSocket.pipe(client)
        client.resume()
      })
      targetSocket.once('error', (error) => {
        console.error('[imap-public] upstream connection failed:', error)
        client.destroy()
      })
    } catch (error) {
      console.error('[imap-public] connection failed:', error)
      client.destroy()
    }
  })
  proxy.maxConnections = options.maxConnections ?? DEFAULT_MAX_CONNECTIONS
  return proxy
}
