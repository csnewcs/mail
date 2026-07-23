import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { deletePublicAttachments } from '$lib/server/public-attachments'

export const DELETE: RequestHandler = async ({ params }) => {
  await deletePublicAttachments([params.token])
  return json({ ok: true })
}
