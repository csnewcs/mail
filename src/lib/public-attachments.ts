export type PublicAttachmentLink = {
  token: string
  name: string
  contentType: string
  size: number
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;')
}

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

export function publicAttachmentUrl(origin: string, token: string) {
  return `${origin.replace(/\/$/, '')}/attachments/${encodeURIComponent(token)}`
}

export function appendPublicAttachmentLinks(
  html: string | null | undefined,
  origin: string,
  attachments: PublicAttachmentLink[]
) {
  if (attachments.length === 0) return html ?? null

  const items = attachments
    .map((attachment) => {
      const href = escapeHtml(publicAttachmentUrl(origin, attachment.token))
      return `<li><a href="${href}">${escapeHtml(attachment.name)}</a> (${formatBytes(attachment.size)})</li>`
    })
    .join('')
  const section = `<div><p><strong>Download attachments</strong></p><ul>${items}</ul></div>`
  const body = html?.trim() ?? ''
  const closingBody = body.match(/<\/body\s*>/i)

  if (closingBody?.index !== undefined) {
    return `${body.slice(0, closingBody.index)}${section}${body.slice(closingBody.index)}`
  }
  return `${body}${section}`
}

export function attachmentContentDisposition(filename: string) {
  const wellFormedFilename = filename.toWellFormed()
  const fallback = wellFormedFilename
    .replace(/[^\x20-\x7e]/g, '_')
    .replace(/["\\]/g, '_')
    .replace(/[\r\n]/g, '_')
  return `attachment; filename="${fallback || 'attachment'}"; filename*=UTF-8''${encodeURIComponent(wellFormedFilename)}`
}
