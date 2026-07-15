import { and, eq } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { account, mailConfig } from '$lib/server/db/schema'
import { evaluateOidcSubjectClaim } from '$lib/server/oidc-access-policy'

const OIDC_PROVIDER_ID = 'oidc'

export async function claimOidcSubject(discoveryUrl: string, subject: string): Promise<boolean> {
  return db.transaction(async (tx) => {
    await tx.insert(mailConfig).values({ id: 1 }).onConflictDoNothing({ target: mailConfig.id })

    const [binding] = await tx
      .select({
        subject: mailConfig.oidcSubject,
        discoveryUrl: mailConfig.oidcSubjectDiscoveryUrl
      })
      .from(mailConfig)
      .where(eq(mailConfig.id, 1))
      .limit(1)
      .for('update')

    if (!binding) throw new Error('OIDC configuration row is missing')

    const claim = evaluateOidcSubjectClaim(binding, discoveryUrl, subject)

    if (claim.endpointChanged) {
      // A subject is only unique within its issuer. Remove stale links before reusing providerId.
      await tx.delete(account).where(eq(account.providerId, OIDC_PROVIDER_ID))
    }

    if (claim.nextBinding !== binding) {
      await tx
        .update(mailConfig)
        .set({
          oidcSubject: claim.nextBinding.subject,
          oidcSubjectDiscoveryUrl: claim.nextBinding.discoveryUrl
        })
        .where(eq(mailConfig.id, 1))
    }

    return claim.allowed
  })
}

export async function isOidcUserAuthorized(discoveryUrl: string, userId: string): Promise<boolean> {
  const [binding] = await db
    .select({
      subject: mailConfig.oidcSubject,
      discoveryUrl: mailConfig.oidcSubjectDiscoveryUrl
    })
    .from(mailConfig)
    .where(eq(mailConfig.id, 1))
    .limit(1)

  if (!binding?.subject || binding.discoveryUrl !== discoveryUrl) return false

  const [linkedAccount] = await db
    .select({ id: account.id })
    .from(account)
    .where(
      and(
        eq(account.providerId, OIDC_PROVIDER_ID),
        eq(account.accountId, binding.subject),
        eq(account.userId, userId)
      )
    )
    .limit(1)

  return Boolean(linkedAccount)
}
