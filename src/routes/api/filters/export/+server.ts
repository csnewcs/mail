import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { asc } from 'drizzle-orm'
import { createFilterExport } from '$lib/server/filterImportExport'
import { db } from '$lib/server/db'
import { mailFilter } from '$lib/server/db/schema'
import { isDemoModeEnabled, listDemoFilters } from '$lib/server/demo'

export const GET: RequestHandler = async () => {
  const filters = isDemoModeEnabled()
    ? listDemoFilters()
    : await db.select().from(mailFilter).orderBy(asc(mailFilter.sortOrder))

  return json(createFilterExport(filters))
}
