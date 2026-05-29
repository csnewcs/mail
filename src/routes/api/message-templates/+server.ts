import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { messageTemplate } from '$lib/server/db/schema'
import { asc } from 'drizzle-orm'
import {
  createDemoMessageTemplate,
  isDemoModeEnabled,
  listDemoMessageTemplates
} from '$lib/server/demo'

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) {
    return json({ templates: listDemoMessageTemplates() })
  }

  const templates = await db.select().from(messageTemplate).orderBy(asc(messageTemplate.name))
  return json({ templates })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const subject = typeof body.subject === 'string' ? body.subject.trim() : ''
  const html = typeof body.html === 'string' ? body.html.trim() : ''
  const isSnippet = body.isSnippet === true

  if (!name || !html) return error(400, 'Missing required fields: name, html')

  if (isDemoModeEnabled()) {
    return json({ id: createDemoMessageTemplate({ name, subject, html, isSnippet }) })
  }

  const [inserted] = await db
    .insert(messageTemplate)
    .values({ name, subject, html, isSnippet })
    .returning({ id: messageTemplate.id })

  return json({ id: inserted?.id })
}
