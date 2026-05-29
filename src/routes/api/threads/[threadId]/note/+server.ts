import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { decodeThreadId } from '$lib/thread-url'
import { getThreadNote, saveThreadNote, serializeThreadNote } from '$lib/server/thread-notes'

const MAX_NOTE_LENGTH = 10_000

export const GET: RequestHandler = async ({ params }) => {
  const threadId = decodeThreadId(params.threadId)
  if (!threadId) return error(400, 'threadId is required')

  const note = await getThreadNote(threadId)
  return json({ note: serializeThreadNote(note) })
}

export const PUT: RequestHandler = async ({ params, request }) => {
  const threadId = decodeThreadId(params.threadId)
  if (!threadId) return error(400, 'threadId is required')

  const body = await request.json().catch(() => error(400, 'Invalid JSON body'))
  if (typeof body !== 'object' || body === null || Array.isArray(body)) {
    return error(400, 'JSON body must be an object')
  }

  if (!('body' in body) || typeof body.body !== 'string') {
    return error(400, 'body must be a string')
  }

  if (body.body.length > MAX_NOTE_LENGTH) {
    return error(413, `Thread note cannot exceed ${MAX_NOTE_LENGTH} characters`)
  }

  const note = await saveThreadNote(threadId, body.body)
  return json({ note: serializeThreadNote(note) })
}
