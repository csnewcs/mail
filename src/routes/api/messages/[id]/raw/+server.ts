import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getStoredRawMessageById } from '$lib/server/mail'

export const GET: RequestHandler = async ({ params }) => {
  const source = await getStoredRawMessageById(params.id)
  if (source === undefined) error(404, 'Message not found')
  if (source === null) error(404, 'Raw source is not available for this message')

  return new Response(Uint8Array.from(source).buffer, {
    headers: {
      'content-type': 'message/rfc822',
      'cache-control': 'private, no-store',
      'x-content-type-options': 'nosniff',
      'content-disposition': `inline; filename="message-${params.id}.eml"`
    }
  })
}
