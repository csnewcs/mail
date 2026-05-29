import type { PageServerLoad } from './$types'
import { getDisplayConfig } from '$lib/server/config'
import {
  getBlockRemoteContentEnabled,
  getCompactModeEnabled,
  getDensityPreference,
  getRemoteContentAllowedSenders,
  getSimplifiedViewEnabled,
  getThemePreference,
  getTranslationTargetLanguage
} from '$lib/server/preferences'
import { env } from '$env/dynamic/private'
import { listAuditLogs } from '$lib/server/audit-log'
import { isDemoModeEnabled } from '$lib/server/demo'

export const load: PageServerLoad = async ({ cookies }) => {
  const config = await getDisplayConfig()
  return {
    config,
    origin: env.ORIGIN ?? '',
    simplifiedView: getSimplifiedViewEnabled(cookies),
    density: getDensityPreference(cookies),
    compactMode: getCompactModeEnabled(cookies),
    themePreference: getThemePreference(cookies),
    translationTargetLanguage: getTranslationTargetLanguage(cookies),
    remoteContent: {
      blockRemoteContent: getBlockRemoteContentEnabled(cookies),
      allowedSenders: getRemoteContentAllowedSenders(cookies)
    },
    auditLog: isDemoModeEnabled() ? [] : await listAuditLogs(25)
  }
}
