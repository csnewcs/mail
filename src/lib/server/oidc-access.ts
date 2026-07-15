import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailConfig } from '$lib/server/db/schema'

export async function prepareOidcIssuer(endpoint: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.insert(mailConfig).values({ id: 1 }).onConflictDoNothing({ target: mailConfig.id })

    const [binding] = await tx
      .select({ endpoint: mailConfig.oidcSubjectDiscoveryUrl })
      .from(mailConfig)
      .where(eq(mailConfig.id, 1))
      .limit(1)
      .for('update')

    if (!binding) throw new Error('OIDC configuration row is missing')
    if (binding.endpoint === endpoint) return true
    if (binding.endpoint) return false

    await tx
      .update(mailConfig)
      .set({ oidcSubjectDiscoveryUrl: endpoint })
      .where(eq(mailConfig.id, 1))
    return true
  })
}
