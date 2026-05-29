import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { savedSearch } from '$lib/server/db/schema'
import { eq } from 'drizzle-orm'

export const PUT: RequestHandler = async ({ params, request }) => {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid saved search ID')

  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  if (!name) return error(400, 'Missing required field: name')

  await db.update(savedSearch).set({ name }).where(eq(savedSearch.id, id))
  return json({ ok: true })
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isFinite(id)) return error(400, 'Invalid saved search ID')

  await db.delete(savedSearch).where(eq(savedSearch.id, id))
  return json({ ok: true })
}
