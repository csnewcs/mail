import { convert } from 'html-to-text'
import { parseDocument } from 'htmlparser2'

export function outgoingMessageBody(value: string | null | undefined) {
  const fragment = value?.trim()
  if (!fragment) return {}

  const hasHtmlElement = parseDocument(fragment).children.some(
    (node) => 'name' in node && node.name.toLowerCase() === 'html'
  )
  const html = hasHtmlElement
    ? fragment
    : `<!doctype html><html><head><meta charset="utf-8"></head><body>${fragment}</body></html>`
  const text = convert(html, { wordwrap: 120 }).trim() || ' '
  return { html, text }
}
