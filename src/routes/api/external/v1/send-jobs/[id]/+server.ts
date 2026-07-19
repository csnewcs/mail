import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { ExternalApiError, getExternalSendJob } from '$lib/server/external-mail'

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) return json({ error: 'Invalid job ID' }, { status: 400 })
  try {
    return json({ job: await getExternalSendJob(id) })
  } catch (error) {
    if (error instanceof ExternalApiError)
      return json({ error: error.message }, { status: error.status })
    throw error
  }
}
