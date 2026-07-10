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
  getThreadModeOnPageLoadEnabled,
  getTranslationTargetLanguage
} from '$lib/server/preferences'
import { env } from '$env/dynamic/private'
import { getImapMailboxes } from '$lib/server/mail'

export const load: PageServerLoad = async ({ cookies }) => {
  const config = await getDisplayConfig()
  const imapMailboxes = await getImapMailboxes()
  return {
    config,
    imapMailboxes,
    origin: env.ORIGIN ?? '',
    simplifiedView: getSimplifiedViewEnabled(cookies),
    threadModeOnPageLoad: getThreadModeOnPageLoadEnabled(cookies),
    density: getDensityPreference(cookies),
    compactMode: getCompactModeEnabled(cookies),
    themePreference: getThemePreference(cookies),
    translationTargetLanguage: getTranslationTargetLanguage(cookies),
    remoteContent: {
      blockRemoteContent: getBlockRemoteContentEnabled(cookies),
      allowedSenders: getRemoteContentAllowedSenders(cookies)
    },
    mailboxPreferences: getMailboxPreferences(cookies)
  }
}
