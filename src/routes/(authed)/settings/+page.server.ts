import type { PageServerLoad } from './$types'
import { getDisplayConfig } from '$lib/server/config'
import { getStoredPreferences } from '$lib/server/preferences'
import { env } from '$env/dynamic/private'
import { getImapMailboxes } from '$lib/server/mail'
import { getLoginMethods } from '$lib/server/auth-methods'
import { isDemoModeEnabled } from '$lib/server/demo'

export const load: PageServerLoad = async () => {
  const config = await getDisplayConfig()
  const [imapMailboxes, loginMethods, preferences] = await Promise.all([
    getImapMailboxes(),
    getLoginMethods(),
    getStoredPreferences()
  ])
  return {
    config,
    demoMode: isDemoModeEnabled(),
    loginMethods,
    imapMailboxes,
    origin: env.ORIGIN ?? '',
    ...preferences,
    compactMode: preferences.density !== 'comfortable'
  }
}
