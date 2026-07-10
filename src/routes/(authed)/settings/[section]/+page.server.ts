import type { PageServerLoad } from './$types'
import { load as loadSettings } from '../+page.server'

export const load: PageServerLoad = async (event) =>
  loadSettings(event as unknown as Parameters<typeof loadSettings>[0])
