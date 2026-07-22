import { randomUUID } from 'node:crypto'
import type { ComposerAttachment } from '$lib/mail-attachments'
import type { PublicAttachmentLink } from '$lib/public-attachments'
import { db } from './db'
import { publicAttachment } from './db/schema'
import { deleteDemoPublicAttachments, isDemoModeEnabled, storeDemoPublicAttachments } from './demo'
import { inArray } from 'drizzle-orm'

export async function storePublicAttachments(
  attachments: ComposerAttachment[]
): Promise<PublicAttachmentLink[]> {
  const links = attachments.map((attachment) => ({
    token: randomUUID(),
    name: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size
  }))
  if (links.length === 0) return links

  if (isDemoModeEnabled()) {
    storeDemoPublicAttachments(attachments, links)
    return links
  }

  await db.insert(publicAttachment).values(
    attachments.map((attachment, index) => ({
      token: links[index].token,
      filename: attachment.name,
      contentType: attachment.contentType,
      size: attachment.size,
      content: Buffer.from(attachment.contentBase64, 'base64')
    }))
  )
  return links
}

export async function deletePublicAttachments(tokens: string[]) {
  if (tokens.length === 0) return
  if (isDemoModeEnabled()) {
    deleteDemoPublicAttachments(tokens)
    return
  }
  await db.delete(publicAttachment).where(inArray(publicAttachment.token, tokens))
}
