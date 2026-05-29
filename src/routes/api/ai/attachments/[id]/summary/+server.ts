import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getDemoAttachment, isDemoModeEnabled } from '$lib/server/demo'
import { isTextLikeAttachment, summarizeAttachment } from '$lib/server/attachment-summary'
import { logServerError } from '$lib/server/perf'

function demoSummary(id: number) {
  const attachment = getDemoAttachment(id)
  if (!attachment) return null
  if (!isTextLikeAttachment(attachment.filename, attachment.contentType)) {
    throw new Error('Only text-like attachments can be summarized right now.')
  }

  const text = new TextDecoder('utf-8', { fatal: false }).decode(attachment.content).trim()
  const lines = text.split(/\r?\n/).filter(Boolean)
  return {
    summary: [
      `Summary of ${attachment.filename}:`,
      lines
        .slice(0, 4)
        .map((line) => `- ${line}`)
        .join('\n') || '- No readable text found.'
    ].join('\n'),
    cached: false,
    filename: attachment.filename,
    contentType: attachment.contentType,
    size: attachment.size
  }
}

export const POST: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) error(400, 'Invalid attachment ID')

  if (isDemoModeEnabled()) {
    const result = demoSummary(id)
    if (!result) error(404, 'Attachment not found')
    return json(result)
  }

  try {
    const result = await summarizeAttachment(id)
    if (!result) error(404, 'Attachment not found')
    return json(result)
  } catch (err) {
    logServerError('api.ai.attachment-summary', err, { attachmentId: id })
    error(400, err instanceof Error ? err.message : 'Attachment summary failed')
  }
}
