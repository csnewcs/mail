import { and, eq, inArray } from 'drizzle-orm'
import { db } from '$lib/server/db'
import { account, passkey } from '$lib/server/db/schema'
import {
  getAuthenticationConfig,
  isOAuthClientConfigured,
  isOidcConfigComplete
} from '$lib/server/config'
import { getAuthUserId } from '$lib/server/auth-owner'
import { isDemoModeEnabled } from '$lib/server/demo'

export type LoginMethods = {
  password: boolean
  passkey: boolean
  github: boolean
  discord: boolean
  oidc: boolean
}

export async function getLoginMethods(): Promise<LoginMethods> {
  if (isDemoModeEnabled()) {
    return { password: false, passkey: false, github: false, discord: false, oidc: false }
  }

  const [ownerId, authentication] = await Promise.all([getAuthUserId(), getAuthenticationConfig()])

  let password = false
  let hasPasskey = false
  if (ownerId) {
    const [[credential], [registeredPasskey]] = await Promise.all([
      db
        .select({ id: account.id })
        .from(account)
        .where(
          and(
            eq(account.userId, ownerId),
            inArray(account.providerId, ['credential', 'email-password'])
          )
        )
        .limit(1),
      db.select({ id: passkey.id }).from(passkey).where(eq(passkey.userId, ownerId)).limit(1)
    ])
    password = Boolean(credential)
    hasPasskey = Boolean(registeredPasskey)
  }

  return {
    password,
    passkey: hasPasskey,
    github: isOAuthClientConfigured(authentication.github),
    discord: isOAuthClientConfigured(authentication.discord),
    oidc: isOidcConfigComplete(authentication.oidc)
  }
}
