import { eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { mailConfig } from '$lib/server/db/schema'

export async function claimAuthUser(userId: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.insert(mailConfig).values({ id: 1 }).onConflictDoNothing({ target: mailConfig.id })

    const [config] = await tx
      .select({ authUserId: mailConfig.authUserId })
      .from(mailConfig)
      .where(eq(mailConfig.id, 1))
      .limit(1)
      .for('update')

    if (!config) throw new Error('Authentication configuration row is missing')
    if (config.authUserId) return config.authUserId === userId

    await tx
      .update(mailConfig)
      .set({ authUserId: userId, authSetupComplete: true })
      .where(eq(mailConfig.id, 1))
    return true
  })
}

export async function getAuthUserId(): Promise<string | null> {
  const [config] = await db
    .select({ authUserId: mailConfig.authUserId })
    .from(mailConfig)
    .where(eq(mailConfig.id, 1))
    .limit(1)
  return config?.authUserId ?? null
}
