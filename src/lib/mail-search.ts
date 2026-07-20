const MAX_REGEX_CHARS = 160

export function hasExplicitSearchFilter(query: string) {
  const terms = query.match(/(?:[^\s"]+|"[^"]*")+/g) ?? []
  return terms.some((rawTerm) => {
    const term = rawTerm.replace(/^"|"$/g, '')
    const separator = term.indexOf(':')
    if (separator === -1) return false
    const key = term.slice(0, separator).toLowerCase()
    const value = term.slice(separator + 1)
    if (!value) return false
    return (
      ['from', 'to', 'subject', 'before', 'after'].includes(key) ||
      (key === 'has' && value.toLowerCase() === 'attachment')
    )
  })
}

export function validateMailSearchRegex(value: unknown) {
  if (typeof value !== 'string') throw new Error('Search pattern must be a string')
  const pattern = value.trim()
  if (!pattern || pattern.length > MAX_REGEX_CHARS) {
    throw new Error(`Search pattern must be between 1 and ${MAX_REGEX_CHARS} characters`)
  }
  if (
    [...pattern].some(
      (character) => character.charCodeAt(0) < 32 || character.charCodeAt(0) === 127
    )
  ) {
    throw new Error('Search pattern contains control characters')
  }
  if (/\(\?[=!<]/.test(pattern) || /\\[1-9bB]/.test(pattern)) {
    throw new Error('Search pattern uses unsupported advanced expressions')
  }
  return pattern
}

export function parseNaturalSearchSelection(output: string, availableIds: Set<number>) {
  const parsed = JSON.parse(output) as { message_ids?: unknown }
  if (!Array.isArray(parsed.message_ids)) throw new Error('AI search response omitted message_ids')

  const selected: number[] = []
  for (const value of parsed.message_ids) {
    if (!Number.isInteger(value) || !availableIds.has(value as number)) {
      throw new Error('AI search selected an unknown message ID')
    }
    if (!selected.includes(value as number)) selected.push(value as number)
  }
  return selected
}
