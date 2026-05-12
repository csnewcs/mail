import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { sendPushToAll } from '$lib/server/push'
import { isDemoModeEnabled } from '$lib/server/demo'

export const POST: RequestHandler = async () => {
  if (isDemoModeEnabled()) {
    return json({ ok: true, demo: true })
  }

  await sendPushToAll({
    title: 'Test notification',
    body: 'Push notifications are working.',
    url: '/'
  })

  return json({ ok: true })
}
