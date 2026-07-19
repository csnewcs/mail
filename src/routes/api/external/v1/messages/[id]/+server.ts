import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { ExternalApiError, getExternalMessage } from '$lib/server/external-mail'

export const GET: RequestHandler = async ({ params }) => {
  if (!/^\d+$/.test(params.id) || Number(params.id) < 1) {
    return json({ error: 'Invalid message ID' }, { status: 400 })
  }
  try {
    return json({ message: await getExternalMessage(params.id) })
  } catch (error) {
    if (error instanceof ExternalApiError)
      return json({ error: error.message }, { status: error.status })
    throw error
  }
}
