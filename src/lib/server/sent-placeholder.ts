import type { SmtpConfig } from './config'
import { outgoingMessageBody, outgoingSenderAddress } from './outgoing-message.ts'
import { sendStatusFromJobStatus, type SendStatus } from '../send-status.ts'

export type SentPlaceholderJob = {
  id: number
  payload: string
  status: string
  messageId: string | null
  sentMailbox?: string | null
  deliveredAt?: Date | null
  createdAt: Date
}

type PlaceholderPayload = {
  to?: unknown
  cc?: unknown
  subject?: unknown
  html?: unknown
  inReplyTo?: unknown
  smtpServerId?: unknown
  fromName?: unknown
}

export type SentPlaceholder = {
  id: number
  messageId: string
  mailbox: string
  uid: number
  flags: string
  subject: string
  from: string
  to: string
  cc: string
  preview: string
  receivedAt: Date
  snoozedUntil: null
  threadId: string
  important: false
  threadStarred: false
  threadPinned: false
  hasThreadNote: false
  sendStatus: SendStatus
  smtpJobId: number
}

export function sentPlaceholderId(jobId: number) {
  return -jobId
}

export function smtpJobIdFromPlaceholder(id: number) {
  return Number.isInteger(id) && id < 0 ? -id : null
}

export function parseSentPlaceholderPayload(job: SentPlaceholderJob): PlaceholderPayload | null {
  try {
    const payload = JSON.parse(job.payload) as PlaceholderPayload
    return payload && typeof payload === 'object' ? payload : null
  } catch {
    return null
  }
}

export function smtpConfigForPlaceholder(
  payload: PlaceholderPayload,
  configs: SmtpConfig[]
): SmtpConfig | null {
  const serverId = typeof payload.smtpServerId === 'string' ? payload.smtpServerId : null
  return configs.find((config) => config.id === serverId) ?? (serverId ? null : configs[0]) ?? null
}

export function createSentPlaceholder(
  job: SentPlaceholderJob,
  mailbox: string,
  smtpConfig: SmtpConfig | null
): SentPlaceholder | null {
  const payload = parseSentPlaceholderPayload(job)
  const sendStatus = sendStatusFromJobStatus(job.status, job.deliveredAt)
  if (!payload || !job.messageId || !sendStatus) return null

  const subject = typeof payload.subject === 'string' ? payload.subject : ''
  const html = typeof payload.html === 'string' ? payload.html : null
  const text = outgoingMessageBody(html).text?.trim() || subject
  const fromName = typeof payload.fromName === 'string' ? payload.fromName.trim() : ''
  const sender = smtpConfig?.from ?? 'Me'
  const from =
    fromName && smtpConfig ? `${fromName} <${outgoingSenderAddress(smtpConfig.from)}>` : sender

  return {
    id: sentPlaceholderId(job.id),
    messageId: job.messageId,
    mailbox,
    uid: sentPlaceholderId(job.id),
    flags: '["\\\\Seen"]',
    subject,
    from,
    to: typeof payload.to === 'string' ? payload.to : '',
    cc: typeof payload.cc === 'string' ? payload.cc : '',
    preview: text.slice(0, 240),
    receivedAt: job.createdAt,
    snoozedUntil: null,
    threadId: job.messageId,
    important: false,
    threadStarred: false,
    threadPinned: false,
    hasThreadNote: false,
    sendStatus,
    smtpJobId: job.id
  }
}

export function sentPlaceholderDetail(placeholder: SentPlaceholder, job: SentPlaceholderJob) {
  const payload = parseSentPlaceholderPayload(job)
  const htmlContent = typeof payload?.html === 'string' ? payload.html : null
  const textContent = outgoingMessageBody(htmlContent).text?.trim() || placeholder.subject

  return {
    ...placeholder,
    textContent,
    htmlContent,
    replyTo: null,
    inReplyTo: typeof payload?.inReplyTo === 'string' ? payload.inReplyTo : null,
    references: typeof payload?.inReplyTo === 'string' ? payload.inReplyTo : null,
    spfStatus: null,
    dkimStatus: null,
    dmarcStatus: null,
    authservId: null,
    authenticationTrusted: false,
    rawSourceAvailable: false,
    openPgpSigned: false,
    openPgpSignatureStatus: null,
    openPgpSigner: null,
    openPgpFingerprint: null,
    openPgpEncrypted: false,
    openPgpDecrypted: false,
    openPgpError: null
  }
}
