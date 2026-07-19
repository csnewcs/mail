import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailAttachment } from '$lib/server/db/schema'

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id < 1) error(400, 'Invalid attachment ID')
  const [attachment] = await db
    .select()
    .from(mailAttachment)
    .where(eq(mailAttachment.id, id))
    .limit(1)
  if (!attachment) error(404, 'Attachment not found')

  return new Response(new Uint8Array(attachment.content), {
    headers: {
      'content-type': attachment.contentType || 'application/octet-stream',
      'content-disposition': `attachment; filename*=UTF-8''${encodeURIComponent(attachment.filename)}`,
      'content-length': String(attachment.content.length),
      'cache-control': 'private, max-age=3600'
    }
  })
}
