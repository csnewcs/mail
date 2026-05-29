import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { parseComposerAttachments } from '$lib/mail-attachments'
import { isDemoModeEnabled, sendDemoMessage } from '$lib/server/demo'
import { enqueueSmtpSendJob } from '$lib/server/smtp-queue'

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
  if (!to || !subject) {
    return error(400, 'Missing required fields: to, subject')
  }

  const parsedAttachments = parseComposerAttachments(rawAttachments)
  if (!parsedAttachments.ok) {
    return error(400, parsedAttachments.error)
  }

  if (isDemoModeEnabled()) {
    await sendDemoMessage({
      to,
      cc,
      bcc,
      subject,
      html,
      inReplyTo,
      attachments: parsedAttachments.attachments
    })
    return json({ success: true, demo: true })
  }

  const availableAt = typeof sendAt === 'string' && sendAt ? new Date(sendAt) : new Date()
  if (Number.isNaN(availableAt.getTime())) {
    return error(400, 'Invalid sendAt value')
  }

  const jobId = await enqueueSmtpSendJob(
    {
      to,
      cc: cc || null,
      bcc: bcc || null,
      subject,
      html: html ?? null,
      inReplyTo: inReplyTo || null,
      attachments: parsedAttachments.attachments
    },
    availableAt
  )

  return json({ success: true, queued: true, jobId, sendAt: availableAt.toISOString() })
}
