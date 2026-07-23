export type MailtoComposeFields = {
  to: string
  cc: string
  bcc: string
  subject: string
  body: string
}

function headerValues(url: URL, name: string) {
  return Array.from(url.searchParams.entries())
    .filter(([key]) => key.toLowerCase() === name)
    .map(([, value]) => value)
}

function addressHeaderValues(url: URL, name: string) {
  return headerValues(url, name)
    .map((value) => value.trim())
    .filter(Boolean)
}

export function parseMailtoUrl(value: string): MailtoComposeFields | null {
  try {
    const url = new URL(value)
    if (url.protocol !== 'mailto:') return null

    const pathRecipients = decodeURIComponent(url.pathname).trim()
    const queryRecipients = addressHeaderValues(url, 'to')

    return {
      to: [pathRecipients, ...queryRecipients].filter(Boolean).join(', '),
      cc: addressHeaderValues(url, 'cc').join(', '),
      bcc: addressHeaderValues(url, 'bcc').join(', '),
      subject: headerValues(url, 'subject')[0] ?? '',
      body: headerValues(url, 'body')[0] ?? ''
    }
  } catch {
    return null
  }
}
