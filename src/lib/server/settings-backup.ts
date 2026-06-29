export const SETTINGS_BACKUP_SCHEMA_VERSION = 1

type BackupObject = Record<string, unknown>

export type SettingsBackup = {
  schemaVersion: typeof SETTINGS_BACKUP_SCHEMA_VERSION
  exportedAt: string
  app: 'mail'
  settings?: {
    imap?: {
      host?: string
      port?: number
      secure?: boolean
      user?: string
      mailbox?: string
      pollSeconds?: number
    }
    smtp?: {
      host?: string
      port?: number
      secure?: boolean
      user?: string
      from?: string
    }
    oidc?: {
      discoveryUrl?: string
      clientId?: string
    }
    signature?: string
  }
  preferences?: {
    simplifiedView?: boolean
    threadModeOnPageLoad?: boolean
    compactMode?: boolean
    translationTargetLanguage?: string
  }
  filters?: Array<{
    field: string
    operator: string
    value: string
    action: string
    target: string | null
    enabled: boolean
    sortOrder: number
  }>
  savedSearches?: Array<{
    name: string
    query: string
  }>
}

export type SettingsRestoreSelection = {
  settings: boolean
  preferences: boolean
  filters: boolean
  savedSearches: boolean
}

export const DEFAULT_SETTINGS_RESTORE_SELECTION: SettingsRestoreSelection = {
  settings: true,
  preferences: true,
  filters: true,
  savedSearches: true
}

const ALLOWED_FILTER_FIELDS = new Set(['from', 'to', 'subject', 'cc'])
const ALLOWED_FILTER_OPERATORS = new Set(['contains', 'equals', 'starts_with', 'ends_with'])
const ALLOWED_FILTER_ACTIONS = new Set(['mark_read', 'trash', 'move'])
const MAX_BACKUP_STRING_LENGTH = 10_000

function isObject(value: unknown): value is BackupObject {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function optionalString(value: unknown, field: string, errors: string[]): string | undefined {
  if (value == null) return undefined
  if (typeof value !== 'string') {
    errors.push(`${field} must be a string`)
    return undefined
  }
  if (value.length > MAX_BACKUP_STRING_LENGTH) {
    errors.push(`${field} is too long`)
    return undefined
  }
  return value
}

function optionalNumber(value: unknown, field: string, errors: string[]): number | undefined {
  if (value == null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value <= 0) {
    errors.push(`${field} must be a positive number`)
    return undefined
  }
  return Math.trunc(value)
}

function optionalNonNegativeNumber(
  value: unknown,
  field: string,
  errors: string[]
): number | undefined {
  if (value == null) return undefined
  if (typeof value !== 'number' || !Number.isFinite(value) || value < 0) {
    errors.push(`${field} must be a non-negative number`)
    return undefined
  }
  return Math.trunc(value)
}

function optionalBoolean(value: unknown, field: string, errors: string[]): boolean | undefined {
  if (value == null) return undefined
  if (typeof value !== 'boolean') {
    errors.push(`${field} must be a boolean`)
    return undefined
  }
  return value
}

function optionalObject(value: unknown, field: string, errors: string[]): BackupObject | undefined {
  if (value == null) return undefined
  if (!isObject(value)) {
    errors.push(`${field} must be an object`)
    return undefined
  }
  return value
}

export function normalizeRestoreSelection(value: unknown): SettingsRestoreSelection {
  if (!isObject(value)) return DEFAULT_SETTINGS_RESTORE_SELECTION
  return {
    settings: typeof value.settings === 'boolean' ? value.settings : true,
    preferences: typeof value.preferences === 'boolean' ? value.preferences : true,
    filters: typeof value.filters === 'boolean' ? value.filters : true,
    savedSearches: typeof value.savedSearches === 'boolean' ? value.savedSearches : true
  }
}

export function validateSettingsBackup(value: unknown): {
  backup?: SettingsBackup
  errors: string[]
} {
  const errors: string[] = []
  if (!isObject(value)) return { errors: ['Backup must be a JSON object'] }

  if (value.schemaVersion !== SETTINGS_BACKUP_SCHEMA_VERSION) {
    return {
      errors: [`Unsupported settings backup schema version: ${String(value.schemaVersion)}`]
    }
  }

  if (value.app !== 'mail') errors.push('Backup app must be mail')

  const exportedAt =
    optionalString(value.exportedAt, 'exportedAt', errors) ?? new Date().toISOString()
  const settingsObject = optionalObject(value.settings, 'settings', errors)
  const preferencesObject = optionalObject(value.preferences, 'preferences', errors)
  const backup: SettingsBackup = {
    schemaVersion: SETTINGS_BACKUP_SCHEMA_VERSION,
    exportedAt,
    app: 'mail'
  }

  if (settingsObject) {
    const settings: NonNullable<SettingsBackup['settings']> = {}
    const imapObject = optionalObject(settingsObject.imap, 'settings.imap', errors)
    const smtpObject = optionalObject(settingsObject.smtp, 'settings.smtp', errors)
    const oidcObject = optionalObject(settingsObject.oidc, 'settings.oidc', errors)

    if (imapObject) {
      settings.imap = {
        host: optionalString(imapObject.host, 'settings.imap.host', errors),
        port: optionalNumber(imapObject.port, 'settings.imap.port', errors),
        secure: optionalBoolean(imapObject.secure, 'settings.imap.secure', errors),
        user: optionalString(imapObject.user, 'settings.imap.user', errors),
        mailbox: optionalString(imapObject.mailbox, 'settings.imap.mailbox', errors),
        pollSeconds: optionalNumber(imapObject.pollSeconds, 'settings.imap.pollSeconds', errors)
      }
    }

    if (smtpObject) {
      settings.smtp = {
        host: optionalString(smtpObject.host, 'settings.smtp.host', errors),
        port: optionalNumber(smtpObject.port, 'settings.smtp.port', errors),
        secure: optionalBoolean(smtpObject.secure, 'settings.smtp.secure', errors),
        user: optionalString(smtpObject.user, 'settings.smtp.user', errors),
        from: optionalString(smtpObject.from, 'settings.smtp.from', errors)
      }
    }

    if (oidcObject) {
      settings.oidc = {
        discoveryUrl: optionalString(oidcObject.discoveryUrl, 'settings.oidc.discoveryUrl', errors),
        clientId: optionalString(oidcObject.clientId, 'settings.oidc.clientId', errors)
      }
    }

    settings.signature = optionalString(settingsObject.signature, 'settings.signature', errors)
    backup.settings = settings
  }

  if (preferencesObject) {
    backup.preferences = {
      simplifiedView: optionalBoolean(
        preferencesObject.simplifiedView,
        'preferences.simplifiedView',
        errors
      ),
      threadModeOnPageLoad: optionalBoolean(
        preferencesObject.threadModeOnPageLoad,
        'preferences.threadModeOnPageLoad',
        errors
      ),
      compactMode: optionalBoolean(
        preferencesObject.compactMode,
        'preferences.compactMode',
        errors
      ),
      translationTargetLanguage: optionalString(
        preferencesObject.translationTargetLanguage,
        'preferences.translationTargetLanguage',
        errors
      )
    }
  }

  if (value.filters != null) {
    if (!Array.isArray(value.filters)) {
      errors.push('filters must be an array')
    } else {
      backup.filters = value.filters.flatMap((filter, index) => {
        if (!isObject(filter)) {
          errors.push(`filters[${index}] must be an object`)
          return []
        }

        const field = optionalString(filter.field, `filters[${index}].field`, errors) ?? ''
        const operator = optionalString(filter.operator, `filters[${index}].operator`, errors) ?? ''
        const action = optionalString(filter.action, `filters[${index}].action`, errors) ?? ''
        const target =
          filter.target == null
            ? null
            : optionalString(filter.target, `filters[${index}].target`, errors)
        const value = optionalString(filter.value, `filters[${index}].value`, errors) ?? ''

        if (!ALLOWED_FILTER_FIELDS.has(field)) errors.push(`filters[${index}].field is invalid`)
        if (!ALLOWED_FILTER_OPERATORS.has(operator)) {
          errors.push(`filters[${index}].operator is invalid`)
        }
        if (!ALLOWED_FILTER_ACTIONS.has(action)) errors.push(`filters[${index}].action is invalid`)
        if (action === 'move' && !target)
          errors.push(`filters[${index}].target is required for move`)

        return [
          {
            field,
            operator,
            value,
            action,
            target: target ?? null,
            enabled: optionalBoolean(filter.enabled, `filters[${index}].enabled`, errors) ?? true,
            sortOrder:
              optionalNonNegativeNumber(filter.sortOrder, `filters[${index}].sortOrder`, errors) ??
              index
          }
        ]
      })
    }
  }

  if (value.savedSearches != null) {
    if (!Array.isArray(value.savedSearches)) {
      errors.push('savedSearches must be an array')
    } else {
      backup.savedSearches = value.savedSearches.flatMap((search, index) => {
        if (!isObject(search)) {
          errors.push(`savedSearches[${index}] must be an object`)
          return []
        }
        const name =
          optionalString(search.name, `savedSearches[${index}].name`, errors)?.trim() ?? ''
        const query =
          optionalString(search.query, `savedSearches[${index}].query`, errors)?.trim() ?? ''
        if (!name) errors.push(`savedSearches[${index}].name is required`)
        if (!query) errors.push(`savedSearches[${index}].query is required`)
        return [{ name, query }]
      })
    }
  }

  return errors.length > 0 ? { errors } : { backup, errors }
}
