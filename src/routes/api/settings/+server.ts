import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailConfig, mailSignature } from '$lib/server/db/schema'
import { getDisplayConfig, invalidateConfigCache } from '$lib/server/config'
import { invalidateAuth } from '$lib/server/auth'
import {
  getCompactModeEnabled,
  getBlockRemoteContentEnabled,
  getRemoteContentAllowedSenders,
  getDensityPreference,
  getSimplifiedViewEnabled,
  getThemePreference,
  getTranslationTargetLanguage,
  normalizeDensityPreference,
  setBlockRemoteContentEnabled,
  setCompactModeEnabled,
  setDensityPreference,
  setRemoteContentAllowedSenders,
  setSimplifiedViewEnabled,
  setThemePreference,
  setTranslationTargetLanguage
} from '$lib/server/preferences'
import { logServerError } from '$lib/server/perf'
import { isDemoModeEnabled, saveDemoSettings } from '$lib/server/demo'
import { encryptSecret } from '$lib/server/secrets'
import { writeAuditLog } from '$lib/server/audit-log'
import {
  DEFAULT_QUIET_HOURS,
  normalizeQuietHoursTime,
  normalizeQuietHoursTimezone
} from '$lib/server/quiet-hours'
// Note: signature cache invalidation is client-side only (composer.svelte.ts)

type SignatureProfileInput = {
  id?: number
  name: string
  html: string
  isDefault: boolean
}

export const GET: RequestHandler = async ({ cookies }) => {
  const config = await getDisplayConfig()
  return json({
    ...config,
    simplifiedView: getSimplifiedViewEnabled(cookies),
    density: getDensityPreference(cookies),
    compactMode: getCompactModeEnabled(cookies),
    themePreference: getThemePreference(cookies),
    translationTargetLanguage: getTranslationTargetLanguage(cookies),
    remoteContent: {
      blockRemoteContent: getBlockRemoteContentEnabled(cookies),
      allowedSenders: getRemoteContentAllowedSenders(cookies)
    }
  })
}

export const POST: RequestHandler = async (event) => {
  const { request, cookies } = event
  const body = await request.json()

  if (isDemoModeEnabled()) {
    saveDemoSettings(body as Record<string, unknown>)

    if (typeof body.simplifiedView === 'boolean') {
      setSimplifiedViewEnabled(cookies, body.simplifiedView)
    }

    if (typeof body.compactMode === 'boolean') {
      setCompactModeEnabled(cookies, body.compactMode)
    }

    if (typeof body.themePreference === 'string') {
      setThemePreference(cookies, body.themePreference)
    }

    const density = normalizeDensityPreference(body.density)
    if (density) {
      setDensityPreference(cookies, density)
    }

    if (typeof body.translationTargetLanguage === 'string') {
      setTranslationTargetLanguage(cookies, body.translationTargetLanguage)
    }

    if (body.remoteContent && typeof body.remoteContent === 'object') {
      const remoteContent = body.remoteContent as Record<string, unknown>
      if (typeof remoteContent.blockRemoteContent === 'boolean') {
        setBlockRemoteContentEnabled(cookies, remoteContent.blockRemoteContent)
      }
      if (Array.isArray(remoteContent.allowedSenders)) {
        setRemoteContentAllowedSenders(
          cookies,
          remoteContent.allowedSenders.filter((value): value is string => typeof value === 'string')
        )
      }
    }

    return json({ success: true })
  }

  let shouldPersistConfig = false

  const values: typeof mailConfig.$inferInsert = {
    id: 1,
    updatedAt: new Date()
  }

  // IMAP fields — only persist non-empty strings, keep null for "use env var"
  if (body.imap) {
    shouldPersistConfig = true
    const imap = body.imap as Record<string, unknown>
    if (typeof imap.host === 'string') values.imapHost = imap.host.trim() || null
    if (typeof imap.port === 'number') values.imapPort = imap.port > 0 ? imap.port : null
    if (typeof imap.secure === 'boolean') values.imapSecure = imap.secure
    if (typeof imap.user === 'string') values.imapUser = imap.user.trim() || null
    // Empty password means "leave existing / use env" — don't overwrite with empty
    if (typeof imap.password === 'string' && imap.password.trim() && imap.password !== '••••••••') {
      values.imapPassword = encryptSecret(imap.password)
    }
    if (typeof imap.mailbox === 'string') values.imapMailbox = imap.mailbox.trim() || null
    if (typeof imap.pollSeconds === 'number')
      values.imapPollSeconds = imap.pollSeconds > 0 ? imap.pollSeconds : null
  }

  // SMTP fields
  if (body.smtp) {
    shouldPersistConfig = true
    const smtp = body.smtp as Record<string, unknown>
    if (typeof smtp.host === 'string') values.smtpHost = smtp.host.trim() || null
    if (typeof smtp.port === 'number') values.smtpPort = smtp.port > 0 ? smtp.port : null
    if (typeof smtp.secure === 'boolean') values.smtpSecure = smtp.secure
    if (typeof smtp.user === 'string') values.smtpUser = smtp.user.trim() || null
    if (typeof smtp.password === 'string' && smtp.password.trim() && smtp.password !== '••••••••') {
      values.smtpPassword = encryptSecret(smtp.password)
    }
    if (typeof smtp.from === 'string') values.smtpFrom = smtp.from.trim() || null
    if (typeof smtp.undoSendSeconds === 'number') {
      values.smtpUndoSendSeconds = Math.min(30, Math.max(0, Math.floor(smtp.undoSendSeconds)))
    }
  }

  // Signature
  if (typeof body.signature === 'string') {
    shouldPersistConfig = true
    values.signature = body.signature
  }

  const signatureProfilePayload = Array.isArray(body.signatureProfiles)
    ? (body.signatureProfiles as unknown[])
    : null
  const signatureProfiles: SignatureProfileInput[] | null = signatureProfilePayload
    ? signatureProfilePayload
        .filter(
          (signature): signature is Record<string, unknown> =>
            Boolean(signature) && typeof signature === 'object'
        )
        .map((signature, index) => ({
          id: typeof signature.id === 'number' && signature.id > 0 ? signature.id : undefined,
          name:
            typeof signature.name === 'string' && signature.name.trim()
              ? signature.name.trim()
              : `Signature ${index + 1}`,
          html: typeof signature.html === 'string' ? signature.html : '',
          isDefault: signature.isDefault === true
        }))
    : null

  if (signatureProfiles?.length && !signatureProfiles.some((signature) => signature.isDefault)) {
    signatureProfiles[0].isDefault = true
  }

  if (signatureProfiles) {
    shouldPersistConfig = true
    values.signature = signatureProfiles.find((signature) => signature.isDefault)?.html ?? ''
  }

  // OIDC fields
  if (body.oidc) {
    shouldPersistConfig = true
    const oidc = body.oidc as Record<string, unknown>
    if (typeof oidc.discoveryUrl === 'string')
      values.oidcDiscoveryUrl = oidc.discoveryUrl.trim() || null
    if (typeof oidc.clientId === 'string') values.oidcClientId = oidc.clientId.trim() || null
    if (
      typeof oidc.clientSecret === 'string' &&
      oidc.clientSecret.trim() &&
      oidc.clientSecret !== '••••••••'
    ) {
      values.oidcClientSecret = oidc.clientSecret
    }
  }

  if (body.quietHours) {
    shouldPersistConfig = true
    const quietHours = body.quietHours as Record<string, unknown>
    if (typeof quietHours.enabled === 'boolean') values.quietHoursEnabled = quietHours.enabled
    if (typeof quietHours.start === 'string') {
      values.quietHoursStart = normalizeQuietHoursTime(quietHours.start, DEFAULT_QUIET_HOURS.start)
    }
    if (typeof quietHours.end === 'string') {
      values.quietHoursEnd = normalizeQuietHoursTime(quietHours.end, DEFAULT_QUIET_HOURS.end)
    }
    if (typeof quietHours.timezone === 'string') {
      values.quietHoursTimezone = normalizeQuietHoursTimezone(
        quietHours.timezone,
        DEFAULT_QUIET_HOURS.timezone
      )
    }
  }

  try {
    if (shouldPersistConfig) {
      await db.insert(mailConfig).values(values).onConflictDoUpdate({
        target: mailConfig.id,
        set: values
      })
    }

    if (signatureProfiles) {
      await db.delete(mailSignature)
      if (signatureProfiles.length > 0) {
        await db.insert(mailSignature).values(
          signatureProfiles.map((signature) => ({
            name: signature.name,
            html: signature.html,
            isDefault: signature.isDefault,
            updatedAt: new Date()
          }))
        )
      }
    }

    if (typeof body.simplifiedView === 'boolean') {
      setSimplifiedViewEnabled(cookies, body.simplifiedView)
    }

    if (typeof body.compactMode === 'boolean') {
      setCompactModeEnabled(cookies, body.compactMode)
    }

    if (typeof body.themePreference === 'string') {
      setThemePreference(cookies, body.themePreference)
    }

    const density = normalizeDensityPreference(body.density)
    if (density) {
      setDensityPreference(cookies, density)
    }

    if (typeof body.translationTargetLanguage === 'string') {
      setTranslationTargetLanguage(cookies, body.translationTargetLanguage)
    }

    if (body.remoteContent && typeof body.remoteContent === 'object') {
      const remoteContent = body.remoteContent as Record<string, unknown>
      if (typeof remoteContent.blockRemoteContent === 'boolean') {
        setBlockRemoteContentEnabled(cookies, remoteContent.blockRemoteContent)
      }
      if (Array.isArray(remoteContent.allowedSenders)) {
        setRemoteContentAllowedSenders(
          cookies,
          remoteContent.allowedSenders.filter((value): value is string => typeof value === 'string')
        )
      }
    }

    if (shouldPersistConfig) {
      invalidateConfigCache()
      invalidateAuth()
    }

    const changedSettings = Object.keys(values).filter((key) => key !== 'id' && key !== 'updatedAt')
    const preferenceChanges = [
      typeof body.simplifiedView === 'boolean' ? 'simplifiedView' : null,
      typeof body.compactMode === 'boolean' ? 'compactMode' : null,
      typeof body.translationTargetLanguage === 'string' ? 'translationTargetLanguage' : null
    ].filter(Boolean)

    if (changedSettings.length > 0 || preferenceChanges.length > 0) {
      await writeAuditLog({
        action: 'settings.update',
        entityType: 'settings',
        summary: 'Updated application settings',
        metadata: {
          changedSettings,
          preferenceChanges,
          sections: {
            imap: Boolean(body.imap),
            smtp: Boolean(body.smtp),
            oidc: Boolean(body.oidc),
            signature: typeof body.signature === 'string'
          },
          secretsUpdated: {
            imapPassword: 'imapPassword' in values,
            smtpPassword: 'smtpPassword' in values,
            oidcClientSecret: 'oidcClientSecret' in values
          }
        },
        event
      })
    }

    return json({ success: true })
  } catch (err) {
    logServerError('api.settings.POST.save', err, {
      hasImap: Boolean(body.imap),
      hasSmtp: Boolean(body.smtp),
      hasOidc: Boolean(body.oidc),
      density: normalizeDensityPreference(body.density) ?? 'unchanged',
      compactMode: typeof body.compactMode === 'boolean' ? body.compactMode : 'unchanged',
      simplifiedView: typeof body.simplifiedView === 'boolean' ? body.simplifiedView : 'unchanged',
      themePreference:
        typeof body.themePreference === 'string' ? body.themePreference : 'unchanged',
      translationTargetLanguage:
        typeof body.translationTargetLanguage === 'string'
          ? body.translationTargetLanguage
          : 'unchanged',
      remoteContent: body.remoteContent ? 'changed' : 'unchanged'
    })
    const message = err instanceof Error ? err.message : String(err)
    return error(500, `Failed to save settings: ${message}`)
  }
}
