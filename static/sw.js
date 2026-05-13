const CACHE_NAME = 'mail-v3'

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
  event.waitUntil(
    Promise.all([
      self.registration.showNotification(data.title || 'New mail', {
        body: data.body || '',
        icon: '/icon-192.png',
        badge: '/badge.png',
        tag: data.tag || 'mail',
        renotify: true,
        data: { url: data.url || '/' }
      }),
      count !== undefined
        ? navigator.setAppBadge(count).catch(() => {})
        : Promise.resolve()
    ])
  )
})

self.addEventListener('notificationclick', (event) => {
  event.notification.close()
  const rawUrl = event.notification.data?.url || '/'
  const url = new URL(rawUrl, self.location.origin).href
  event.waitUntil(
    clients
      .matchAll({ type: 'window', includeUncontrolled: true })
      .then((windowClients) => {
        for (const client of windowClients) {
          if ('navigate' in client) {
            return client.navigate(url).then((navigatedClient) => {
              if (navigatedClient && 'focus' in navigatedClient) return navigatedClient.focus()
              if ('focus' in client) return client.focus()
              return undefined
            })
          }
        }
        return clients.openWindow(url)
      })
  )
})
