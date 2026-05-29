import type { Cookies } from '@sveltejs/kit'

const SIMPLIFIED_VIEW_COOKIE = 'mail_simplified_view'
const COMPACT_MODE_COOKIE = 'mail_compact_mode'
const DENSITY_COOKIE = 'mail_density'
const TRANSLATION_TARGET_LANGUAGE_COOKIE = 'mail_translation_target_language'
const BLOCK_REMOTE_CONTENT_COOKIE = 'mail_block_remote_content'
const REMOTE_CONTENT_ALLOWED_SENDERS_COOKIE = 'mail_remote_content_allowed_senders'
const THEME_PREFERENCE_COOKIE = 'mail_theme_preference'
const ONE_YEAR_SECONDS = 60 * 60 * 24 * 365
const DEFAULT_TRANSLATION_TARGET_LANGUAGE = 'Korean'
const MAX_ALLOWED_SENDERS_COOKIE_LENGTH = 3500
export const DENSITY_VALUES = ['comfortable', 'compact', 'condensed'] as const
export type DensityPreference = (typeof DENSITY_VALUES)[number]

export type ThemePreference = 'light' | 'dark' | 'system'

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
