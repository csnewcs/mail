import type { LayoutServerLoad } from './$types'
import { isDemoModeEnabled } from '$lib/server/demo'
import { getThemePreference } from '$lib/server/preferences'

export const load: LayoutServerLoad = async ({ cookies }) => {
  return {
    demoMode: isDemoModeEnabled(),
    themePreference: getThemePreference(cookies)
  }
}
