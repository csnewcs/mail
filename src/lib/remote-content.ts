export type RemoteContentSettings = {
  blockRemoteContent: boolean
  allowedSenders: string[]
}

export type RemoteContentResult = {
  html: string
  blockedCount: number
}

const REMOTE_URL_PATTERN = /^(?:https?:)?\/\//i
const URL_PATTERN = /url\((['"]?)(.*?)\1\)/gi
const STYLE_BLOCK_PATTERN = /<style\b[^>]*>[\s\S]*?<\/style>/gi
const TAG_PATTERN = /<([a-z][a-z0-9:-]*)(\s[^>]*)?>/gi
const ATTRIBUTE_PATTERN =
  /\s([a-zA-Z_:][-a-zA-Z0-9_:.]*)(?:\s*=\s*("[^"]*"|'[^']*'|[^\s"'=<>`]+))?/g
const URL_ATTRS = new Set(['src', 'poster', 'background', 'data'])
const HREF_URL_TAGS = new Set(['link', 'base'])

function unquote(value: string | undefined) {
  if (!value) return ''
  if (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  ) {
    return value.slice(1, -1)
  }
  return value
}

function quote(value: string) {
  return `"${value.replaceAll('&', '&amp;').replaceAll('"', '&quot;')}"`
}

function isRemoteUrl(value: string) {
  return REMOTE_URL_PATTERN.test(value.trim())
}

function blockRemoteUrlsInCss(value: string) {
  let blockedCount = 0
  const next = value.replace(URL_PATTERN, (match, _quote: string, rawUrl: string) => {
    if (!isRemoteUrl(rawUrl)) return match
    blockedCount += 1
    return 'url(about:blank)'
  })

  return { value: next, blockedCount }
}

function sanitizeSrcset(value: string) {
  let blockedCount = 0
  const candidates = value
    .split(',')
    .map((candidate) => candidate.trim())
    .filter((candidate) => {
      const [url] = candidate.split(/\s+/, 1)
      const blocked = isRemoteUrl(url ?? '')
      if (blocked) blockedCount += 1
      return !blocked
    })

  return { value: candidates.join(', '), blockedCount }
}

export function normalizeSenderAddress(value: string | null | undefined) {
  if (!value) return ''
  const match = value.match(/<([^>]+)>/)
  const address = (match?.[1] ?? value).trim().toLowerCase()
  return address.includes('@') ? address : ''
}

export function normalizeAllowedSenders(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : (value ?? '').split(/[\n,]/)
  return Array.from(
    new Set(values.map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')))
  ).sort()
}

export function isRemoteContentAllowedForSender(
  sender: string | null | undefined,
  settings: RemoteContentSettings
) {
  if (!settings.blockRemoteContent) return true
  const address = normalizeSenderAddress(sender)
  return Boolean(address && settings.allowedSenders.includes(address))
}

export function sanitizeRemoteContent(html: string): RemoteContentResult {
  let blockedCount = 0
  let sanitized = html.replace(STYLE_BLOCK_PATTERN, (styleBlock) => {
    const result = blockRemoteUrlsInCss(styleBlock)
    blockedCount += result.blockedCount
    return result.value
  })

  sanitized = sanitized.replace(TAG_PATTERN, (match, rawTagName: string, rawAttrs = '') => {
    const tagName = rawTagName.toLowerCase()
    let attrs = ''

    for (const attrMatch of rawAttrs.matchAll(ATTRIBUTE_PATTERN)) {
      const [, rawName, rawValue] = attrMatch
      const name = rawName.toLowerCase()
      const value = unquote(rawValue)

      if (name === 'style') {
        const result = blockRemoteUrlsInCss(value)
        blockedCount += result.blockedCount
        attrs += ` ${rawName}=${quote(result.value)}`
        continue
      }

      if (name === 'srcset') {
        const result = sanitizeSrcset(value)
        blockedCount += result.blockedCount
        if (result.value) attrs += ` ${rawName}=${quote(result.value)}`
        else attrs += ` data-remote-content-blocked-srcset=${quote(value)}`
        continue
      }

      const isUrlAttr = URL_ATTRS.has(name) || (name === 'href' && HREF_URL_TAGS.has(tagName))
      if (isUrlAttr && isRemoteUrl(value)) {
        blockedCount += 1
        attrs += ` data-remote-content-blocked-${name}=${quote(value)}`
        continue
      }

      attrs += attrMatch[0]
    }

    return `<${rawTagName}${attrs}>`
  })

  return { html: sanitized, blockedCount }
}

export function prepareRemoteContent(
  html: string,
  sender: string | null | undefined,
  settings: RemoteContentSettings,
  forceAllow = false
): RemoteContentResult {
  if (forceAllow || isRemoteContentAllowedForSender(sender, settings)) {
    return { html, blockedCount: 0 }
  }

  return sanitizeRemoteContent(html)
}
