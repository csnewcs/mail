import type { PageServerLoad } from './$types'
import { getDisplayConfig } from '$lib/server/config'
import {
  getBlockRemoteContentEnabled,
  getCompactModeEnabled,
  getDensityPreference,
  getMailboxPreferences,
  getRemoteContentAllowedSenders,
  getSimplifiedViewEnabled,
  getThemePreference,
  getThemeStyle,
  getThreadModeOnPageLoadEnabled,
  getTranslationTargetLanguage
} from '$lib/server/preferences'
import { env } from '$env/dynamic/private'
import { getImapMailboxes } from '$lib/server/mail'
import { getLoginMethods } from '$lib/server/auth-methods'
import { isDemoModeEnabled } from '$lib/server/demo'

export const load: PageServerLoad = async ({ cookies }) => {
  const config = await getDisplayConfig()
  const [imapMailboxes, loginMethods] = await Promise.all([getImapMailboxes(), getLoginMethods()])
  return {
    config,
    demoMode: isDemoModeEnabled(),
    loginMethods,
    imapMailboxes,
    origin: env.ORIGIN ?? '',
    simplifiedView: getSimplifiedViewEnabled(cookies),
    threadModeOnPageLoad: getThreadModeOnPageLoadEnabled(cookies),
    density: getDensityPreference(cookies),
    compactMode: getCompactModeEnabled(cookies),
    themePreference: getThemePreference(cookies),
    themeStyle: getThemeStyle(cookies),
    translationTargetLanguage: getTranslationTargetLanguage(cookies),
    remoteContent: {
      blockRemoteContent: getBlockRemoteContentEnabled(cookies),
      allowedSenders: getRemoteContentAllowedSenders(cookies)
    },
    mailboxPreferences: getMailboxPreferences(cookies)
  }
}
