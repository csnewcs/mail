import type { LayoutServerLoad } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import {
  getThemePreference,
  getThemeStyle,
  setThemePreference,
  setThemeStyle
} from '$lib/server/preferences'

export const load: LayoutServerLoad = async ({ cookies }) => {
  const themePreference = getThemePreference(cookies)
  const themeStyle = getThemeStyle(cookies)
  // Rewrite legacy HttpOnly theme cookies so the pre-paint bootstrap can read them.
  setThemePreference(cookies, themePreference)
  setThemeStyle(cookies, themeStyle)

  return {
    demoMode: isDemoModeEnabled(),
    themePreference,
    themeStyle
  }
}
