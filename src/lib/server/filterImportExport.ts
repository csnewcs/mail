export const FILTER_EXPORT_TYPE = 'mail-filter-rules'
export const FILTER_EXPORT_VERSION = 1

const VALID_FIELDS = new Set(['from', 'to', 'subject', 'cc'])
const VALID_OPERATORS = new Set(['contains', 'equals', 'starts_with', 'ends_with'])
const VALID_ACTIONS = new Set(['mark_read', 'trash', 'move'])

export type StoredFilterRule = {
  id: number
  field: string
  operator: string
  value: string
  action: string
  target: string | null
  enabled: boolean
  sortOrder: number
}

export type ExportedFilterRule = {
  field: string
  operator: string
  value: string
  action: string
  target: string | null
  enabled: boolean
  sort_order: number
}

export type FilterExportPayload = {
  type: typeof FILTER_EXPORT_TYPE
  version: typeof FILTER_EXPORT_VERSION
  exportedAt: string
  filters: ExportedFilterRule[]
}

export type ImportIssue = {
  index: number
  message: string
}

export type ImportCandidate = {
  index: number
  rule: ExportedFilterRule
  duplicate: boolean
}

export function createFilterExport(filters: StoredFilterRule[]): FilterExportPayload {
  return {
    type: FILTER_EXPORT_TYPE,
    version: FILTER_EXPORT_VERSION,
    exportedAt: new Date().toISOString(),
    filters: filters.map((filter, index) => ({
      field: filter.field,
      operator: filter.operator,
      value: filter.value,
      action: filter.action,
      target: filter.target,
      enabled: filter.enabled,
      sort_order: Number.isFinite(filter.sortOrder) ? filter.sortOrder : index
    }))
  }
}

export function analyzeFilterImport(payload: unknown, existingFilters: StoredFilterRule[]) {
  const issues: ImportIssue[] = []
  const candidates: ImportCandidate[] = []

  if (!isRecord(payload)) {
    return { issues: [{ index: -1, message: 'Import file must be a JSON object.' }], candidates }
  }

  if (payload.type !== FILTER_EXPORT_TYPE) {
    issues.push({ index: -1, message: `Unsupported import type. Expected ${FILTER_EXPORT_TYPE}.` })
  }
  if (payload.version !== FILTER_EXPORT_VERSION) {
    issues.push({
      index: -1,
      message: `Unsupported import version. Expected ${FILTER_EXPORT_VERSION}.`
    })
  }
  if (!Array.isArray(payload.filters)) {
    issues.push({ index: -1, message: 'Import file must include a filters array.' })
    return { issues, candidates }
  }

  const existingKeys = new Set(existingFilters.map(ruleKey))
  for (let index = 0; index < payload.filters.length; index++) {
    const result = normalizeImportRule(payload.filters[index], index)
    if (typeof result === 'string') {
      issues.push({ index, message: result })
      continue
    }

    candidates.push({ index, rule: result, duplicate: existingKeys.has(ruleKey(result)) })
  }

  return { issues, candidates }
}

export function ruleKey(rule: {
  field: string
  operator: string
  value: string
  action: string
  target: string | null
}) {
  return [
    rule.field,
    rule.operator,
    rule.value.trim().toLowerCase(),
    rule.action,
    rule.target ?? ''
  ].join('\u0000')
}

function normalizeImportRule(value: unknown, index: number): ExportedFilterRule | string {
  if (!isRecord(value)) return `Rule ${index + 1} must be an object.`

  const field = stringValue(value.field)
  const operator = stringValue(value.operator)
  const ruleValue = stringValue(value.value)
  const action = stringValue(value.action)
  const target =
    value.target === null || value.target === undefined ? null : stringValue(value.target)
  const enabled = typeof value.enabled === 'boolean' ? value.enabled : true
  const rawSortOrder = value.sort_order ?? value.sortOrder
  const sortOrder =
    typeof rawSortOrder === 'number' && Number.isFinite(rawSortOrder) ? rawSortOrder : index

  if (!field || !VALID_FIELDS.has(field)) return `Rule ${index + 1} has an unsupported field.`
  if (!operator || !VALID_OPERATORS.has(operator)) {
    return `Rule ${index + 1} has an unsupported operator.`
  }
  if (!ruleValue.trim()) return `Rule ${index + 1} is missing a value.`
  if (!action || !VALID_ACTIONS.has(action)) return `Rule ${index + 1} has an unsupported action.`
  if (action === 'move' && !target?.trim()) return `Rule ${index + 1} moves mail without a target.`

  return {
    field,
    operator,
    value: ruleValue,
    action,
    target: action === 'move' ? target : null,
    enabled,
    sort_order: sortOrder
  }
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function stringValue(value: unknown) {
  return typeof value === 'string' ? value : ''
}
