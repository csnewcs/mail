import { randomUUID } from 'node:crypto'
import { Readable } from 'node:stream'
import type { ComposerAttachment } from '$lib/mail-attachments'
import type { PublicAttachmentLink } from '$lib/public-attachments'
import { db } from './db'
import { publicAttachment } from './db/schema'
import {
  commitDemoPublicAttachments,
  deleteDemoPublicAttachments,
  getDemoPublicAttachment,
  isDemoModeEnabled,
  registerDemoPublicAttachment,
  uncommitDemoPublicAttachments
} from './demo'
import {
  assertPublicAttachmentFile,
  deletePublicAttachmentFile,
  writePublicAttachmentFile
} from './public-attachment-files'
import { and, eq, inArray, isNull } from 'drizzle-orm'

type PublicAttachmentMetadata = {
  filename: string
  contentType: string
  size: number
}

export async function registerPublicAttachment(
  token: string,
  attachment: PublicAttachmentMetadata
) {
  if (isDemoModeEnabled()) {
    registerDemoPublicAttachment(token, attachment)
    return
  }
  await db.insert(publicAttachment).values({ token, ...attachment, content: null })
}

async function getPublicAttachmentMetadata(token: string) {
  if (isDemoModeEnabled()) return getDemoPublicAttachment(token)
  return (
    await db.select().from(publicAttachment).where(eq(publicAttachment.token, token)).limit(1)
  )[0]
}

async function storeLegacyPublicAttachment(
  attachment: Extract<ComposerAttachment, { deliveryMode: 'public' }>
) {
  if (!attachment.contentBase64) throw new Error('Public attachment content is missing')
  const token = randomUUID()
  const metadata = {
    filename: attachment.name,
    contentType: attachment.contentType,
    size: attachment.size
  }
  const content = Buffer.from(attachment.contentBase64, 'base64')

  try {
    await writePublicAttachmentFile(token, Readable.toWeb(Readable.from(content)), content.length)
    await registerPublicAttachment(token, metadata)
  } catch (error) {
    await deletePublicAttachmentFile(token)
    throw error
  }
  return token
}

export async function storePublicAttachments(
  attachments: Extract<ComposerAttachment, { deliveryMode: 'public' }>[]
): Promise<PublicAttachmentLink[]> {
  const links: PublicAttachmentLink[] = []
  const createdTokens: string[] = []
  try {
    for (const attachment of attachments) {
      const token = attachment.token ?? (await storeLegacyPublicAttachment(attachment))
      if (!attachment.token) createdTokens.push(token)
      const stored = await getPublicAttachmentMetadata(token)
      if (
        !stored ||
        stored.filename !== attachment.name ||
        stored.contentType !== attachment.contentType ||
        stored.size !== attachment.size
      ) {
        throw new Error(`Uploaded public attachment is unavailable: ${attachment.name}`)
      }
      if (!stored.content) await assertPublicAttachmentFile(token, attachment.size)
      links.push({
        token,
        name: attachment.name,
        contentType: attachment.contentType,
        size: attachment.size
      })
    }
    return links
  } catch (error) {
    await deletePublicAttachments(createdTokens)
    throw error
  }
}

export async function commitPublicAttachments(tokens: string[]) {
  if (tokens.length === 0) return []
  if (isDemoModeEnabled()) {
    return commitDemoPublicAttachments(tokens)
  }
  return (
    await db
      .update(publicAttachment)
      .set({ committedAt: new Date() })
      .where(and(inArray(publicAttachment.token, tokens), isNull(publicAttachment.committedAt)))
      .returning({ token: publicAttachment.token })
  ).map((attachment) => attachment.token)
}

export async function uncommitPublicAttachments(tokens: string[]) {
  if (tokens.length === 0) return
  if (isDemoModeEnabled()) {
    uncommitDemoPublicAttachments(tokens)
    return
  }
  await db
    .update(publicAttachment)
    .set({ committedAt: null })
    .where(inArray(publicAttachment.token, tokens))
}

export async function deletePublicAttachments(tokens: string[]) {
  if (tokens.length === 0) return
  const deletedTokens = isDemoModeEnabled()
    ? deleteDemoPublicAttachments(tokens)
    : (
        await db
          .delete(publicAttachment)
          .where(and(inArray(publicAttachment.token, tokens), isNull(publicAttachment.committedAt)))
          .returning({ token: publicAttachment.token })
      ).map((attachment) => attachment.token)
  await Promise.all(deletedTokens.map(deletePublicAttachmentFile))
}
