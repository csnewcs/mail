import type { Cookies } from '@sveltejs/kit'
import { LIST_RATIO_COOKIE, parseListRatio } from '$lib/list-width'

const SIMPLIFIED_VIEW_COOKIE = 'mail_simplified_view'
const THREAD_MODE_ON_PAGE_LOAD_COOKIE = 'mail_thread_mode_on_page_load'
const COMPACT_MODE_COOKIE = 'mail_compact_mode'
const DENSITY_COOKIE = 'mail_density'
const TRANSLATION_TARGET_LANGUAGE_COOKIE = 'mail_translation_target_language'
const BLOCK_REMOTE_CONTENT_COOKIE = 'mail_block_remote_content'
const REMOTE_CONTENT_ALLOWED_SENDERS_COOKIE = 'mail_remote_content_allowed_senders'
const THEME_PREFERENCE_COOKIE = 'mail_theme_preference'
const MAILBOX_PREFERENCES_COOKIE = 'mail_mailbox_preferences'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const DEFAULT_TRANSLATION_TARGET_LANGUAGE = 'Korean'
const MAX_ALLOWED_SENDERS_COOKIE_LENGTH = 3500
const MAX_MAILBOX_PREFERENCES_COOKIE_LENGTH = 6000
export const DENSITY_VALUES = ['comfortable', 'compact', 'condensed'] as const
export type DensityPreference = (typeof DENSITY_VALUES)[number]

export type ThemePreference = 'light' | 'dark' | 'system'
export type MailboxPreferences = {
  order: string[]
  hidden: string[]
}

function normalizeMailboxPathList(value: unknown) {
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
  if (!value || typeof value !== 'object') return { order: [], hidden: [] }
  const record = value as Record<string, unknown>
  return {
    order: normalizeMailboxPathList(record.order),
    hidden: normalizeMailboxPathList(record.hidden)
  }
}

function normalizeThemePreference(value: string | null | undefined): ThemePreference {
  return value === 'light' || value === 'dark' || value === 'system' ? value : 'system'
}

function normalizeTranslationTargetLanguage(value: string | null | undefined) {
  const normalized = value?.trim()?.slice(0, 80)
  return normalized || DEFAULT_TRANSLATION_TARGET_LANGUAGE
}

export function getSimplifiedViewEnabled(cookies: Pick<Cookies, 'get'>) {
  return cookies.get(SIMPLIFIED_VIEW_COOKIE) !== '0'
}

export function setSimplifiedViewEnabled(cookies: Pick<Cookies, 'set'>, enabled: boolean) {
  cookies.set(SIMPLIFIED_VIEW_COOKIE, enabled ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getThreadModeOnPageLoadEnabled(cookies: Pick<Cookies, 'get'>) {
  return cookies.get(THREAD_MODE_ON_PAGE_LOAD_COOKIE) !== '0'
}

export function setThreadModeOnPageLoadEnabled(cookies: Pick<Cookies, 'set'>, enabled: boolean) {
  cookies.set(THREAD_MODE_ON_PAGE_LOAD_COOKIE, enabled ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getCompactModeEnabled(cookies: Pick<Cookies, 'get'>) {
  return getDensityPreference(cookies) !== 'comfortable'
}

export function setCompactModeEnabled(cookies: Pick<Cookies, 'set'>, enabled: boolean) {
  setDensityPreference(cookies, enabled ? 'compact' : 'comfortable')
}

export function normalizeDensityPreference(value: unknown): DensityPreference | null {
  return typeof value === 'string' && DENSITY_VALUES.includes(value as DensityPreference)
    ? (value as DensityPreference)
    : null
}

export function getDensityPreference(cookies: Pick<Cookies, 'get'>): DensityPreference {
  const density = normalizeDensityPreference(cookies.get(DENSITY_COOKIE))
  if (density) return density

  return cookies.get(COMPACT_MODE_COOKIE) === '1' ? 'compact' : 'comfortable'
}

export function setDensityPreference(cookies: Pick<Cookies, 'set'>, density: DensityPreference) {
  cookies.set(DENSITY_COOKIE, density, {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
  cookies.set(COMPACT_MODE_COOKIE, density === 'comfortable' ? '0' : '1', {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getTranslationTargetLanguage(cookies: Pick<Cookies, 'get'>) {
  return normalizeTranslationTargetLanguage(cookies.get(TRANSLATION_TARGET_LANGUAGE_COOKIE))
}

export function setTranslationTargetLanguage(cookies: Pick<Cookies, 'set'>, value: string) {
  cookies.set(TRANSLATION_TARGET_LANGUAGE_COOKIE, normalizeTranslationTargetLanguage(value), {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function normalizeRemoteContentAllowedSenders(value: string | string[] | null | undefined) {
  const values = Array.isArray(value) ? value : (value ?? '').split(/[\n,]/)
  return Array.from(
    new Set(values.map((item) => item.trim().toLowerCase()).filter((item) => item.includes('@')))
  ).sort()
}

export function getBlockRemoteContentEnabled(cookies: Pick<Cookies, 'get'>) {
  return cookies.get(BLOCK_REMOTE_CONTENT_COOKIE) !== '0'
}

export function setBlockRemoteContentEnabled(cookies: Pick<Cookies, 'set'>, enabled: boolean) {
  cookies.set(BLOCK_REMOTE_CONTENT_COOKIE, enabled ? '1' : '0', {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getRemoteContentAllowedSenders(cookies: Pick<Cookies, 'get'>) {
  return normalizeRemoteContentAllowedSenders(cookies.get(REMOTE_CONTENT_ALLOWED_SENDERS_COOKIE))
}

export function setRemoteContentAllowedSenders(
  cookies: Pick<Cookies, 'set'>,
  allowedSenders: string[]
) {
  const value = normalizeRemoteContentAllowedSenders(allowedSenders)
    .join('\n')
    .slice(0, MAX_ALLOWED_SENDERS_COOKIE_LENGTH)
  cookies.set(REMOTE_CONTENT_ALLOWED_SENDERS_COOKIE, value, {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getListRatio(cookies: Pick<Cookies, 'get'>) {
  return parseListRatio(cookies.get(LIST_RATIO_COOKIE))
}

export function getThemePreference(cookies: Pick<Cookies, 'get'>) {
  return normalizeThemePreference(cookies.get(THEME_PREFERENCE_COOKIE))
}

export function setThemePreference(cookies: Pick<Cookies, 'set'>, value: string) {
  cookies.set(THEME_PREFERENCE_COOKIE, normalizeThemePreference(value), {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function getMailboxPreferences(cookies: Pick<Cookies, 'get'>): MailboxPreferences {
  try {
    return normalizeMailboxPreferences(JSON.parse(cookies.get(MAILBOX_PREFERENCES_COOKIE) ?? '{}'))
  } catch {
    return { order: [], hidden: [] }
  }
}

export function setMailboxPreferences(
  cookies: Pick<Cookies, 'set'>,
  value: unknown,
  validPaths: string[] = []
) {
  const validPathSet = new Set(validPaths)
  const preferences = normalizeMailboxPreferences(value)
  const normalized = {
    order: preferences.order.filter((path) => validPathSet.size === 0 || validPathSet.has(path)),
    hidden: preferences.hidden.filter((path) => validPathSet.size === 0 || validPathSet.has(path))
  }
  const serialized = JSON.stringify(normalized).slice(0, MAX_MAILBOX_PREFERENCES_COOKIE_LENGTH)
  cookies.set(MAILBOX_PREFERENCES_COOKIE, serialized, {
    path: '/',
    sameSite: 'lax',
    maxAge: ONE_YEAR_SECONDS
  })
}

export function applyMailboxPreferences<T extends { path: string }>(
  mailboxes: T[],
  preferences: MailboxPreferences
) {
  const hidden = new Set(preferences.hidden)
  const order = new Map(preferences.order.map((path, index) => [path, index]))

  return mailboxes
    .filter((mailbox) => !hidden.has(mailbox.path))
    .sort((left, right) => {
      const leftOrder = order.get(left.path) ?? Number.MAX_SAFE_INTEGER
      const rightOrder = order.get(right.path) ?? Number.MAX_SAFE_INTEGER
      if (leftOrder !== rightOrder) return leftOrder - rightOrder
      return 0
    })
}
