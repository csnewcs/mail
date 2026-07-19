import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import test from 'node:test'
import vm from 'node:vm'

type PushEvent = {
  data: { json: () => unknown; text: () => string }
  waitUntil: (value: Promise<unknown>) => void
}

test('read control pushes close matching notifications without showing a new one', async () => {
  const listeners = new Map<string, (event: PushEvent) => void>()
  const closed: number[] = []
  const shown: Array<{ title: string; options: { tag?: string } }> = []
  const markers = new Map<string, Response>()
  const notifications = [1, 2, 3].map((messageId) => ({
    data: { messageId },
    close: () => closed.push(messageId)
  }))
  const self = {
    location: { origin: 'https://mail.example' },
    registration: {
      getNotifications: async () => notifications,
      showNotification: async (title: string, options: { tag?: string }) => {
        shown.push({ title, options })
      }
    },
    addEventListener: (type: string, handler: (event: PushEvent) => void) => {
      listeners.set(type, handler)
    }
  }
  const cache = {
    put: async (key: string, response: Response) => markers.set(key, response),
    keys: async () => [...markers.keys()],
    delete: async (key: string) => markers.delete(key),
    match: async (key: string) => markers.get(key)
  }
  const caches = { open: async () => cache }
  const navigator = { setAppBadge: async () => {} }
  const source = readFileSync(new URL('../../static/sw.js', import.meta.url), 'utf8')
  vm.runInNewContext(source, {
    self,
    caches,
    navigator,
    Response,
    URL,
    Set,
    Array,
    Number,
    Promise
  })
  const handlePush = listeners.get('push')
  assert.ok(handlePush)

  const completions: Promise<unknown>[] = []
  handlePush({
    data: {
      json: () => ({ type: 'messages-read', messageIds: [2, 99] }),
      text: () => ''
    },
    waitUntil: (value) => completions.push(value)
  })
  // Queue a stale notification concurrently; the read tombstone must be stored first.
  handlePush({
    data: { json: () => ({ title: 'Stale mail', messageId: 2 }), text: () => '' },
    waitUntil: (value) => completions.push(value)
  })
  await Promise.all(completions)
  assert.deepEqual(closed, [2])
  assert.equal(shown.length, 0)

  handlePush({
    data: { json: () => ({ title: 'New mail', messageId: 7 }), text: () => '' },
    waitUntil: (value) => completions.push(value)
  })
  await completions.at(-1)
  assert.equal(shown[0]?.options.tag, 'mail')
})
