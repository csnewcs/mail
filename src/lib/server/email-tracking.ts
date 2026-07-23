const TRANSPARENT_GIF = Uint8Array.from([
  71, 73, 70, 56, 57, 97, 1, 0, 1, 0, 128, 0, 0, 0, 0, 0, 255, 255, 255, 33, 249, 4, 1, 0, 0, 0, 0,
  44, 0, 0, 0, 0, 1, 0, 1, 0, 0, 2, 2, 68, 1, 0, 59
])
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
const MAX_NOTIFICATION_RETRY_DELAY_MS = 5 * 60_000

export function isEmailTrackingToken(value: string) {
  return UUID_PATTERN.test(value)
}

export function emailTrackingPixelUrl(origin: string | undefined, token: string | null) {
  if (!origin || !token) return null
  try {
    const url = new URL(`/email-open/${encodeURIComponent(token)}/pixel.gif`, origin)
    if (url.protocol !== 'http:' && url.protocol !== 'https:') return null
    return url.href
  } catch {
    return null
  }
}

export function addEmailTrackingPixel(html: string, pixelUrl: string) {
  const escapedUrl = pixelUrl.replaceAll('&', '&amp;').replaceAll('"', '&quot;')
  const pixel = `<img src="${escapedUrl}" width="1" height="1" alt="" style="display:block;width:1px;height:1px;border:0" />`
  const bodyEnd = html.match(/<\/body\s*>/i)
  if (bodyEnd?.index === undefined) return `${html}${pixel}`
  return `${html.slice(0, bodyEnd.index)}${pixel}${html.slice(bodyEnd.index)}`
}

export function emailTrackingPixelResponse() {
  return new Response(TRANSPARENT_GIF, {
    headers: {
      'cache-control': 'no-store, no-cache, max-age=0, must-revalidate',
      'content-length': String(TRANSPARENT_GIF.byteLength),
      'content-type': 'image/gif',
      expires: '0',
      pragma: 'no-cache',
      'x-content-type-options': 'nosniff'
    }
  })
}

export function shouldRecordEmailOpen(request: Request) {
  return request.headers.get('sec-fetch-site') !== 'same-origin' && !request.headers.has('cookie')
}

export function emailReadNotification(payload: string, url: string, jobId: number) {
  let subject = '(no subject)'
  try {
    const parsed = JSON.parse(payload) as { subject?: unknown }
    if (typeof parsed.subject === 'string' && parsed.subject.trim()) subject = parsed.subject.trim()
  } catch {
    // The read event is still useful if a legacy job has an invalid payload.
  }

  return {
    title: 'Email read',
    body: `A recipient read "${subject}".`,
    url,
    tag: `email-read-${jobId}`
  }
}

export function emailReadNotificationRetryDelay(attemptCount: number) {
  return Math.min(MAX_NOTIFICATION_RETRY_DELAY_MS, 1_000 * 2 ** Math.min(attemptCount, 9))
}
