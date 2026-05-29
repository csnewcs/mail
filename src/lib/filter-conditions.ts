export type FilterCondition = {
  field: string
  operator: string
  value: string
}

export type FilterConditionSet = {
  version: 1
  match: 'all' | 'any'
  conditions: FilterCondition[]
}

export const FILTER_FIELDS = ['from', 'to', 'subject', 'cc'] as const
export const FILTER_OPERATORS = ['contains', 'equals', 'starts_with', 'ends_with'] as const

const DEFAULT_FIELD = 'from'
const DEFAULT_OPERATOR = 'contains'

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function normalizeCondition(value: unknown): FilterCondition | null {
  if (!isRecord(value)) return null

  const field = typeof value.field === 'string' ? value.field : DEFAULT_FIELD
  const operator = typeof value.operator === 'string' ? value.operator : DEFAULT_OPERATOR
  const conditionValue = typeof value.value === 'string' ? value.value.trim() : ''

  if (!FILTER_FIELDS.includes(field as (typeof FILTER_FIELDS)[number])) return null
  if (!FILTER_OPERATORS.includes(operator as (typeof FILTER_OPERATORS)[number])) return null
  if (!conditionValue) return null

  return { field, operator, value: conditionValue }
}

export function normalizeFilterConditions(
  value: unknown,
  fallback?: FilterCondition
): FilterConditionSet {
  const fallbackCondition = normalizeCondition(fallback)

  if (!isRecord(value)) {
    return {
      version: 1,
      match: 'all',
      conditions: fallbackCondition ? [fallbackCondition] : []
    }
  }

  const match = value.match === 'any' ? 'any' : 'all'
  const rawConditions = Array.isArray(value.conditions) ? value.conditions : []
  const conditions = rawConditions
    .map((condition) => normalizeCondition(condition))
    .filter((condition): condition is FilterCondition => condition !== null)

  return {
    version: 1,
    match,
    conditions: conditions.length > 0 ? conditions : fallbackCondition ? [fallbackCondition] : []
  }
}
