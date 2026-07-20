const NON_INCOMING_SPECIAL_USE = new Set(['\\Sent', '\\Drafts', '\\Trash', '\\Junk'])
const OUTGOING_SPECIAL_USE = new Set(['\\Sent', '\\Drafts'])
const NON_INCOMING_PATH_RE =
  /\b(drafts?|sent|spam|junk([\s._-]?email)?|trash|deleted[\s._-]?(items|messages)?)\b/i
const OUTGOING_PATH_RE = /\b(drafts?|sent)\b/i

type MailboxCopy = { path: string; specialUse?: string | null }
type ImportanceInput = {
  id: number
  subject: string
  from: string
  to: string
  preview: string
  excerpt: string
}

export function parseImportanceResults(value: string, expectedIds: number[]) {
  const parsed = JSON.parse(value) as { results?: Array<{ id?: unknown; important?: unknown }> }
  if (!Array.isArray(parsed.results)) throw new Error('Invalid importance classification response')

  const expected = new Set(expectedIds)
  const results = new Map<number, boolean>()
  for (const item of parsed.results) {
    if (!Number.isInteger(item.id) || !expected.has(item.id as number)) {
      throw new Error('Importance classification returned an unknown message ID')
    }
    if (typeof item.important !== 'boolean' || results.has(item.id as number)) {
      throw new Error('Importance classification returned an invalid result')
    }
    results.set(item.id as number, item.important)
  }
  if (results.size !== expected.size) throw new Error('Importance classification omitted messages')
  return results
}

export function isIncomingMailbox(path: string, specialUse: string | null | undefined) {
  if (specialUse && NON_INCOMING_SPECIAL_USE.has(specialUse)) return false
  return !NON_INCOMING_PATH_RE.test(path)
}

export function normalizeImportanceAddress(value: string) {
  const address = value.match(/<([^<>]+)>/)?.[1] ?? value
  return address.trim().toLowerCase()
}

export function hasIncomingMailboxCopy(copies: MailboxCopy[]) {
  if (
    copies.some(
      (copy) =>
        (copy.specialUse && OUTGOING_SPECIAL_USE.has(copy.specialUse)) ||
        OUTGOING_PATH_RE.test(copy.path)
    )
  ) {
    return false
  }
  return copies.some((copy) => isIncomingMailbox(copy.path, copy.specialUse))
}

export function buildImportanceInput(messages: ImportanceInput[], maxChars: number) {
  const fields: Array<keyof Omit<ImportanceInput, 'id'>> = [
    'excerpt',
    'preview',
    'subject',
    'from',
    'to'
  ]
  const normalized = messages.map((message) => ({ ...message }))

  while (true) {
    const value = JSON.stringify(normalized)
    if (value.length <= maxChars) return value

    let changed = false
    for (const message of normalized) {
      for (const field of fields) {
        const text = message[field]
        if (text.length <= 32) continue
        message[field] = text.slice(0, Math.max(32, Math.floor(text.length * 0.75)))
        changed = true
      }
    }
    if (!changed) throw new Error('Importance classification input exceeds its size limit')
  }
}
