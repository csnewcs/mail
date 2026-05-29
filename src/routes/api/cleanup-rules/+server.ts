import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { asc } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailCleanupRule } from '$lib/server/db/schema'
import { normalizeCleanupRuleInput } from '$lib/server/cleanup-rules'
import { isDemoModeEnabled } from '$lib/server/demo'

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json({ rules: [] })

  const rules = await db.select().from(mailCleanupRule).orderBy(asc(mailCleanupRule.id))
  return json({ rules })
}

export const POST: RequestHandler = async ({ request }) => {
  try {
    const values = normalizeCleanupRuleInput(await request.json())
    if (isDemoModeEnabled()) return json({ id: Date.now() })

    const [inserted] = await db
      .insert(mailCleanupRule)
      .values(values)
      .returning({ id: mailCleanupRule.id })
    if (!inserted) return error(500, 'Failed to create cleanup rule')
    return json({ id: inserted.id })
  } catch (err) {
    return error(400, err instanceof Error ? err.message : 'Invalid cleanup rule')
  }
}
