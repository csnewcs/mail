import type { PageServerLoad } from './$types'
import { redirect } from '@sveltejs/kit'
import { getLoginMethods } from '$lib/server/auth-methods'

export const load: PageServerLoad = async ({ locals }) => {
  if (locals.user) {
    redirect(302, '/')
  }
  return { methods: await getLoginMethods() }
}
