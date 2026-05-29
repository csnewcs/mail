import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { messageTemplate } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'
import {
  deleteDemoMessageTemplate,
  isDemoModeEnabled,
  updateDemoMessageTemplate
} from '$lib/server/demo'

export const PUT: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid template ID')

  const body = await request.json()
  const updates: Partial<typeof messageTemplate.$inferInsert> = { updatedAt: new Date() }

  if (typeof body.name === 'string') updates.name = body.name.trim()
  if (typeof body.subject === 'string') updates.subject = body.subject.trim()
  if (typeof body.html === 'string') updates.html = body.html.trim()
  if (typeof body.isSnippet === 'boolean') updates.isSnippet = body.isSnippet

  if (updates.name === '' || updates.html === '') return error(400, 'Name and HTML are required')

  if (isDemoModeEnabled()) {
    updateDemoMessageTemplate(id, updates as Record<string, unknown>)
    return json({ ok: true })
  }

  await db.update(messageTemplate).set(updates).where(eq(messageTemplate.id, id))
  return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid template ID')

  if (isDemoModeEnabled()) {
    deleteDemoMessageTemplate(id)
    return json({ ok: true })
  }

  await db.delete(messageTemplate).where(eq(messageTemplate.id, id))
  return json({ ok: true })
}
