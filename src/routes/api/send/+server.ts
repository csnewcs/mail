import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { parseComposerAttachments } from '$lib/mail-attachments'
import { normalizeRecipientList, validateRecipientFields } from '$lib/recipients'
import { getUndoSendSeconds } from '$lib/server/config'
import { isDemoModeEnabled, sendDemoMessage } from '$lib/server/demo'
import { enqueueSmtpSendJob } from '$lib/server/smtp-queue'

function sendValidationError(message: string, details?: unknown) {
  return json({ error: { code: 'SEND_VALIDATION_ERROR', message, details } }, { status: 400 })
}

export const POST: RequestHandler = async ({ request }) => {
  const {
    to,
    cc,
    bcc,
    subject,
    html,
    inReplyTo,
    sendAt,
    attachments: rawAttachments
  } = await request.json()
  if (!subject) {
    return sendValidationError('Missing required fields: subject')
  }

  const recipientValidation = validateRecipientFields({ to, cc, bcc })
  if (recipientValidation.errors.length > 0) {
    return sendValidationError(
      recipientValidation.errors.map((issue) => issue.message).join('\n'),
      recipientValidation.errors
    )
  }

  const normalizedTo = normalizeRecipientList(to)
  const normalizedCc = normalizeRecipientList(cc)
  const normalizedBcc = normalizeRecipientList(bcc)

  const parsedAttachments = parseComposerAttachments(rawAttachments)
  if (!parsedAttachments.ok) {
    return error(400, parsedAttachments.error)
  }

  if (isDemoModeEnabled()) {
    await sendDemoMessage({
      to: normalizedTo,
      cc: normalizedCc,
      bcc: normalizedBcc,
      subject,
      html,
      inReplyTo,
      attachments: parsedAttachments.attachments
    })
    return json({ success: true, demo: true })
  }

  const hasExplicitSendAt = typeof sendAt === 'string' && sendAt.length > 0
  const undoSendSeconds = hasExplicitSendAt ? 0 : await getUndoSendSeconds()
  const availableAt = hasExplicitSendAt
    ? new Date(sendAt)
    : new Date(Date.now() + undoSendSeconds * 1000)
  if (Number.isNaN(availableAt.getTime())) {
    return error(400, 'Invalid sendAt value')
  }

  const jobId = await enqueueSmtpSendJob(
    {
      to: normalizedTo,
      cc: normalizedCc || null,
      bcc: normalizedBcc || null,
      subject,
      html: html ?? null,
      inReplyTo: inReplyTo || null,
      attachments: parsedAttachments.attachments
    },
    availableAt
  )

  return json({
    success: true,
    queued: true,
    jobId,
    sendAt: availableAt.toISOString(),
    undoable: undoSendSeconds > 0,
    undoSendSeconds
  })
}
