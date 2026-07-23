export const COMPOSED_MAILBOX_SLUG_PREFIX = 'composed-'

export type ComposableMailRow = {
  messageId: string
  uid: number
  receivedAt: Date | null
  threadId?: string | null
  threadCount?: number
  threadStarred?: boolean
  threadPinned?: boolean
  hasThreadNote?: boolean
  hasUnread?: boolean
  hasImportantUnread?: boolean
}

export function normalizeComposedMailboxName(value: unknown) {
  return typeof value === 'string' ? value.trim().replace(/\s+/g, ' ').slice(0, 80) : ''
}

export function normalizeComposedMailboxPaths(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((path): path is string => typeof path === 'string')
        .map((path) => path.trim())
        .filter(Boolean)
    )
  )
}

export function composedMailboxSlug(name: string) {
  const normalized = name
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60)
  return `${COMPOSED_MAILBOX_SLUG_PREFIX}${normalized || 'mailbox'}`
}

export function mergeComposedRows<T extends ComposableMailRow>(
  rowSets: T[][],
  limit: number,
  offset: number
) {
  const merged = new Map<string, T>()
  for (const row of rowSets.flat()) {
    const key =
      row.threadCount !== undefined && row.threadId ? `thread:${row.threadId}` : row.messageId
    const current = merged.get(key)
    if (!current) {
      merged.set(key, { ...row })
      continue
    }

    const currentTime = current.receivedAt?.getTime() ?? 0
    const rowTime = row.receivedAt?.getTime() ?? 0
    const latest =
      rowTime > currentTime || (rowTime === currentTime && row.uid > current.uid) ? row : current
    merged.set(key, {
      ...latest,
      threadStarred: Boolean(current.threadStarred || row.threadStarred),
      threadPinned: Boolean(current.threadPinned || row.threadPinned),
      hasThreadNote: Boolean(current.hasThreadNote || row.hasThreadNote),
      ...(current.hasUnread !== undefined || row.hasUnread !== undefined
        ? { hasUnread: Boolean(current.hasUnread || row.hasUnread) }
        : {}),
      ...(current.hasImportantUnread !== undefined || row.hasImportantUnread !== undefined
        ? {
            hasImportantUnread: Boolean(current.hasImportantUnread || row.hasImportantUnread)
          }
        : {})
    })
  }

  return Array.from(merged.values())
    .sort((left, right) => {
      const pinned = Number(Boolean(right.threadPinned)) - Number(Boolean(left.threadPinned))
      if (pinned !== 0) return pinned
      const time = (right.receivedAt?.getTime() ?? 0) - (left.receivedAt?.getTime() ?? 0)
      return time || right.uid - left.uid
    })
    .slice(offset, offset + limit)
}
