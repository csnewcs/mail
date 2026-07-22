import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { attachmentContentDisposition } from '$lib/public-attachments'
import { db } from '$lib/server/db'
import { publicAttachment } from '$lib/server/db/schema'
import { getDemoPublicAttachment, isDemoModeEnabled } from '$lib/server/demo'
import { eq } from 'drizzle-orm'

export const GET: RequestHandler = async ({ params }) => {
  const attachment = isDemoModeEnabled()
    ? getDemoPublicAttachment(params.token)
    : (
        await db
          .select()
          .from(publicAttachment)
          .where(eq(publicAttachment.token, params.token))
          .limit(1)
      )[0]

  if (!attachment) return error(404, 'Attachment not found')

  const body =
    attachment.content instanceof Buffer
      ? attachment.content.buffer.slice(
          attachment.content.byteOffset,
          attachment.content.byteOffset + attachment.content.byteLength
        )
      : attachment.content
  const filename = 'filename' in attachment ? attachment.filename : ''

  return new Response(body as ArrayBuffer, {
    headers: {
      'Content-Type': attachment.contentType,
      'Content-Disposition': attachmentContentDisposition(filename),
      'Content-Length': String(attachment.size),
      'Cache-Control': 'private, max-age=3600',
      'X-Content-Type-Options': 'nosniff'
    }
  })
}
