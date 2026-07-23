export type MailboxPreferences = {
  order: string[]
  hidden: string[]
  collapsedAccounts: string[]
}

function normalizeStringList(value: unknown) {
  if (!Array.isArray(value)) return []
  return Array.from(
    new Set(
      value
        .filter((item): item is string => typeof item === 'string')
        .map((item) => item.trim())
        .filter(Boolean)
    )
  )
}

export function normalizeMailboxPreferences(value: unknown): MailboxPreferences {
  if (!value || typeof value !== 'object') {
    return { order: [], hidden: [], collapsedAccounts: [] }
  }

  const record = value as Record<string, unknown>
  return {
    order: normalizeStringList(record.order),
    hidden: normalizeStringList(record.hidden),
    collapsedAccounts: normalizeStringList(record.collapsedAccounts)
  }
}

export function mergeMailboxPreferences(current: MailboxPreferences, patch: unknown) {
  const values = patch && typeof patch === 'object' ? (patch as Record<string, unknown>) : {}
  return normalizeMailboxPreferences({ ...current, ...values })
}
