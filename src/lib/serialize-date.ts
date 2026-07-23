export function serializeDate(value: Date | string | null | undefined) {
  if (typeof value === 'string') return value
  return value?.toISOString() ?? null
}
