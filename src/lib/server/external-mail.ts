import { eq } from 'drizzle-orm'
import { parseComposerAttachments } from '$lib/mail-attachments'
import { normalizeRecipientList, validateRecipientFields } from '$lib/recipients'
import { db } from './db'
import { mailAttachment, smtpJob } from './db/schema'
import {
  countSearchMessages,
  countStoredMessages,
  getStoredMessageById,
  listStoredMessages,
  resolveMailboxPath,
  searchMessages,
  type MailListRow
} from './mail'
import { enqueueSmtpSendJob } from './smtp-queue'

const DEFAULT_LIMIT = 50
const MAX_LIMIT = 100
const MAX_OFFSET = 10_000

export class ExternalApiError extends Error {
  constructor(
    public status: number,
    message: string,
    public details?: unknown
  ) {
    super(message)
  }
}

function parseInteger(value: string | null, fallback: number) {
  const parsed = Number(value)
  return Number.isInteger(parsed) && parsed >= 0 ? parsed : fallback
}

export function serializeExternalMessage(message: MailListRow) {
  return {
    id: message.id,
    messageId: message.messageId,
    mailbox: message.mailbox,
    uid: message.uid,
    subject: message.subject,
    from: message.from,
    to: message.to,
    cc: message.cc,
    preview: message.preview,
    flags: JSON.parse(message.flags) as string[],
    receivedAt: message.receivedAt?.toISOString() ?? null,
    snoozedUntil: message.snoozedUntil?.toISOString() ?? null,
    threadId: message.threadId ?? null
  }
}

export async function listExternalMessages(url: URL) {
  const offset = Math.min(parseInteger(url.searchParams.get('offset'), 0), MAX_OFFSET)
  const limit = Math.min(
    Math.max(parseInteger(url.searchParams.get('limit'), DEFAULT_LIMIT), 1),
    MAX_LIMIT
  )
  const query = url.searchParams.get('q')?.trim() ?? ''
  const unreadOnly = url.searchParams.get('unread') === '1'

  if (query) {
    const [messages, total] = await Promise.all([
      searchMessages(query, limit + offset + 1, 0),
      countSearchMessages(query)
    ])
    const page = messages.slice(offset, offset + limit + 1)
    return {
      messages: page.slice(0, limit).map(serializeExternalMessage),
      offset,
      limit,
      total,
      hasMore: page.length > limit
    }
  }

  const mailbox = await resolveMailboxPath(url.searchParams.get('mailbox') ?? 'inbox')
  const [messages, total] = await Promise.all([
    listStoredMessages(mailbox, limit + 1, offset, unreadOnly),
    countStoredMessages(mailbox, unreadOnly)
  ])
  return {
    messages: messages.slice(0, limit).map(serializeExternalMessage),
    offset,
    limit,
    total,
    hasMore: messages.length > limit
  }
}

export async function getExternalMessage(id: string | number) {
  const message = await getStoredMessageById(id)
  if (!message) throw new ExternalApiError(404, 'Message not found')
  const attachments = await db
    .select({
      id: mailAttachment.id,
      filename: mailAttachment.filename,
      contentType: mailAttachment.contentType,
      size: mailAttachment.size
    })
    .from(mailAttachment)
    .where(eq(mailAttachment.messageId, message.messageId))

  return {
    ...serializeExternalMessage(message),
    replyTo: message.replyTo,
    textContent: message.textContent,
    htmlContent: message.htmlContent,
    inReplyTo: message.inReplyTo,
    references: message.references,
    openPgp: {
      signed: message.openPgpSigned ?? false,
      signatureStatus: message.openPgpSignatureStatus ?? null,
      signer: message.openPgpSigner ?? null,
      fingerprint: message.openPgpFingerprint ?? null,
      encrypted: message.openPgpEncrypted ?? false,
      decrypted: message.openPgpDecrypted ?? false,
      error: message.openPgpError ?? null
    },
    attachments: attachments.map((attachment) => ({
      ...attachment,
      downloadUrl: `/api/external/v1/attachments/${attachment.id}`
    }))
  }
}

export async function sendExternalMessage(input: unknown) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new ExternalApiError(400, 'Request body must be an object')
  }
  const body = input as Record<string, unknown>
  const to = typeof body.to === 'string' ? body.to : ''
  const cc = typeof body.cc === 'string' ? body.cc : null
  const bcc = typeof body.bcc === 'string' ? body.bcc : null
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  if (!subject) throw new ExternalApiError(400, 'subject is required')

  const recipientValidation = validateRecipientFields({ to, cc, bcc })
  if (recipientValidation.errors.length > 0) {
    throw new ExternalApiError(400, 'Invalid recipients', recipientValidation.errors)
  }
  const attachments = parseComposerAttachments(body.attachments)
  if (!attachments.ok) throw new ExternalApiError(400, attachments.error)

  const sendAt = typeof body.sendAt === 'string' && body.sendAt ? new Date(body.sendAt) : new Date()
  if (Number.isNaN(sendAt.getTime())) throw new ExternalApiError(400, 'sendAt must be an ISO date')

  const jobId = await enqueueSmtpSendJob(
    {
      to: normalizeRecipientList(to),
      cc: normalizeRecipientList(cc) || null,
      bcc: normalizeRecipientList(bcc) || null,
      subject,
      html: typeof body.html === 'string' ? body.html : null,
      inReplyTo: typeof body.inReplyTo === 'string' ? body.inReplyTo || null : null,
      smtpServerId: typeof body.smtpServerId === 'string' ? body.smtpServerId || null : null,
      fromName: typeof body.fromName === 'string' ? body.fromName.trim() || null : null,
      attachments: attachments.attachments,
      openPgpSigning: ['none', 'cleartext', 'detached', 'pgp-mime'].includes(
        String(body.openPgpSigning)
      )
        ? (body.openPgpSigning as 'none' | 'cleartext' | 'detached' | 'pgp-mime')
        : 'none',
      openPgpEncrypt: body.openPgpEncrypt === true,
      attachPublicKey: body.attachPublicKey === true
    },
    sendAt
  )
  if (jobId === null) throw new ExternalApiError(500, 'Failed to queue message')
  return { jobId, status: 'pending', sendAt: sendAt.toISOString() }
}

export async function getExternalSendJob(id: number) {
  const [job] = await db
    .select({
      id: smtpJob.id,
      status: smtpJob.status,
      attemptCount: smtpJob.attemptCount,
      availableAt: smtpJob.availableAt,
      lastError: smtpJob.lastError,
      createdAt: smtpJob.createdAt,
      updatedAt: smtpJob.updatedAt
    })
    .from(smtpJob)
    .where(eq(smtpJob.id, id))
    .limit(1)
  if (!job) throw new ExternalApiError(404, 'Send job not found')
  return {
    ...job,
    availableAt: job.availableAt.toISOString(),
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  }
}
