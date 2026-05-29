import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { asc } from 'drizzle-orm'
import { analyzeFilterImport } from '$lib/server/filterImportExport'
import { db } from '$lib/server/db'
import { mailFilter } from '$lib/server/db/schema'
import { createDemoFilters, isDemoModeEnabled, listDemoFilters } from '$lib/server/demo'

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json()
  const payload = body.payload ?? body
  const apply = body.apply === true
  const includeDuplicates = body.conflictStrategy === 'duplicate'

  const existingFilters = isDemoModeEnabled()
    ? listDemoFilters()
    : await db.select().from(mailFilter).orderBy(asc(mailFilter.sortOrder))
  const analysis = analyzeFilterImport(payload, existingFilters)
  const importable = analysis.candidates.filter(
    (candidate) => includeDuplicates || !candidate.duplicate
  )

  if (!apply) {
    return json({
      ok: analysis.issues.length === 0,
      issues: analysis.issues,
      candidates: analysis.candidates,
      importableCount: importable.length,
      duplicateCount: analysis.candidates.length - importable.length
    })
  }

  if (analysis.issues.length > 0) {
    return error(400, 'Import file contains invalid rules. Preview the import for details.')
  }

  const nextSortOrder =
    existingFilters.reduce((max, filter) => Math.max(max, filter.sortOrder), -1) + 1
  const rows = importable.map((candidate, index) => ({
    field: candidate.rule.field,
    operator: candidate.rule.operator,
    value: candidate.rule.value,
    action: candidate.rule.action,
    target: candidate.rule.target,
    enabled: candidate.rule.enabled,
    sortOrder: nextSortOrder + index
  }))

  if (rows.length > 0) {
    if (isDemoModeEnabled()) {
      createDemoFilters(rows)
    } else {
      await db.insert(mailFilter).values(rows)
    }
  }

  return json({
    imported: rows.length,
    skippedDuplicates: analysis.candidates.length - importable.length
  })
}
