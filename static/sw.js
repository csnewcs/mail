const CACHE_NAME = 'mail-v4'
const MARK_READ_ACTION = 'mark-read'

function getNotificationUrl(notification) {
  const rawUrl = notification.data?.url || '/'
  return new URL(rawUrl, self.location.origin).href
}

async function openApp(url) {
  const windowClients = await clients.matchAll({ type: 'window', includeUncontrolled: true })
  for (const client of windowClients) {
    if ('navigate' in client) {
      const navigatedClient = await client.navigate(url)
      if (navigatedClient && 'focus' in navigatedClient) return navigatedClient.focus()
      if ('focus' in client) return client.focus()
      return undefined
    }
  }
  return clients.openWindow(url)
}

async function markNotificationMessageRead(notification) {
  const messageId = notification.data?.messageId
  if (!Number.isInteger(messageId) || messageId <= 0) return false

  const response = await fetch('/api/messages/bulk', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ ids: [messageId], action: 'mark_read' })
  })

  return response.ok
}

self.addEventListener('install', () => {
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE_NAME).map((k) => caches.delete(k)))
    ).then(() => self.clients.claim())
  )
})

self.addEventListener('push', (event) => {
  if (!event.data) return
  let data
  try {
    data = event.data.json()
  } catch {
    data = { title: 'New mail', body: event.data.text() }
  }
  const count = typeof data.unreadCount === 'number' ? data.unreadCount : undefined
  const messageId = Number.isInteger(data.messageId) && data.messageId > 0 ? data.messageId : undefined
  const actions = messageId ? [{ action: MARK_READ_ACTION, title: 'Mark read' }] : []
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'New mail', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/badge.png',
        tag: data.tag || 'mail',
        renotify: true,
        data: { url: data.url || '/', messageId },
        actions
      }),
      count !== undefined
        ? navigator.setAppBadge(count).catch(() => {})
        : Promise.resolve()
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const url = getNotificationUrl(event.notification)

  if (event.action === MARK_READ_ACTION) {
    event.waitUntil(
      markNotificationMessageRead(event.notification)
        .catch(() => false)
        .then((ok) => (ok ? undefined : openApp(url)))
    )
    return
  }

  event.waitUntil(openApp(url))
})

self.addEventListener('message', (event) => {
  if (event.data?.type !== 'CLEAR_OFFLINE_CACHE') return
  event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((key) => caches.delete(key)))))
})
