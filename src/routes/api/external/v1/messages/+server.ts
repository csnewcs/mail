import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import {
  ExternalApiError,
  listExternalMessages,
  sendExternalMessage
} from '$lib/server/external-mail'

function apiError(error: unknown) {
  if (error instanceof ExternalApiError) {
    return json({ error: error.message, details: error.details }, { status: error.status })
  }
  throw error
}

export const GET: RequestHandler = async ({ url }) => {
  try {
    return json(await listExternalMessages(url))
  } catch (error) {
    return apiError(error)
  }
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const result = await sendExternalMessage(await request.json().catch(() => null))
    return json(result, {
      status: 202,
      headers: { location: `/api/external/v1/send-jobs/${result.jobId}` }
    })
  } catch (error) {
    return apiError(error)
  }
}
