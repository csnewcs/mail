import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { savedSearch } from '$lib/server/db/schema'
import { asc } from 'drizzle-orm'

export const GET: RequestHandler = async () => {
  const searches = await db.select().from(savedSearch).orderBy(asc(savedSearch.name))
  return json({ searches })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  const name = typeof body.name === 'string' ? body.name.trim() : ''
  const query = typeof body.query === 'string' ? body.query.trim() : ''

  if (!name || !query) return error(400, 'Missing required fields: name, query')

  const [inserted] = await db
    .insert(savedSearch)
    .values({ name, query })
    .returning({ id: savedSearch.id })

  return json({ id: inserted?.id })
}
