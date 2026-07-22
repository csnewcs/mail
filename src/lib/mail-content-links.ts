const OPENABLE_LINK_PROTOCOLS = new Set(['http:', 'https:', 'mailto:', 'tel:'])

export function resolveMailContentUrl(rawHref: string | null | undefined, baseUrl: string) {
  const href = rawHref?.trim()
  if (!href || href.startsWith('#')) return null

  try {
    const url = new URL(href, baseUrl)
    return OPENABLE_LINK_PROTOCOLS.has(url.protocol) ? url.href : null
  } catch {
    return null
  }
}

function closestMailContentLink(target: EventTarget | null) {
  if (!target || typeof target !== 'object') return null

  const candidate = target as {
    closest?: (selector: string) => Element | null
    parentElement?: { closest?: (selector: string) => Element | null }
  }

  return (candidate.closest?.('a[href]') ??
    candidate.parentElement?.closest?.('a[href]') ??
    null) as HTMLAnchorElement | null
}

export function interceptMailContentLinks(doc: Document, onLink: (url: string) => void) {
  const handleClick = (event: MouseEvent) => {
    const anchor = closestMailContentLink(event.target)
    const rawHref = anchor?.getAttribute('href')
    if (!anchor || !rawHref?.trim() || rawHref.trim().startsWith('#')) return

    event.preventDefault()
    event.stopPropagation()

    const url = resolveMailContentUrl(rawHref, anchor.ownerDocument.baseURI)
    if (!url) return
    onLink(url)
  }

  doc.addEventListener('click', handleClick)
}
