import type { LayoutServerLoad } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import { getStoredPreferences } from '$lib/server/preferences'

export const load: LayoutServerLoad = async ({ cookies }) => {
  const { themePreference, themeStyle } = await getStoredPreferences()
  // Keep a client-readable cache solely for the pre-hydration theme bootstrap.
  const options = {
    path: '/',
    httpOnly: false,
    sameSite: 'lax' as const,
    maxAge: 60 * 60 * 24 * 365
  }
  cookies.set('mail_theme_preference', themePreference, options)
  cookies.set('mail_theme_style', JSON.stringify(themeStyle), options)

  return {
    demoMode: isDemoModeEnabled(),
    themePreference,
    themeStyle
  }
}
