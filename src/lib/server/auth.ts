import { betterAuth } from 'better-auth/minimal'
import { drizzleAdapter } from 'better-auth/adapters/drizzle'
import { sveltekitCookies } from 'better-auth/svelte-kit'
import { genericOAuth } from 'better-auth/plugins'
import { APIError } from 'better-auth/api'
import { env } from '$env/dynamic/private'
import { getRequestEvent } from '$app/server'
import { db } from '$lib/server/db'
import { getOidcConfig } from '$lib/server/config'
import { isDemoModeEnabled } from '$lib/server/demo'
import { claimOidcSubject } from '$lib/server/oidc-access'

type AuthInstance = ReturnType<typeof betterAuth>

let _auth: AuthInstance | null = null

async function createAuth(): Promise<AuthInstance> {
  if (isDemoModeEnabled()) {
    throw new Error('better-auth is disabled in demo mode')
  }
  const oidc = await getOidcConfig()
  return betterAuth({
    baseURL: env.ORIGIN,
    secret: env.BETTER_AUTH_SECRET,
    database: drizzleAdapter(db, { provider: 'pg' }),
    account: { accountLinking: { trustedProviders: ['oidc'] } },
    plugins: [
      genericOAuth({
        config: [
          {
            providerId: 'oidc',
            discoveryUrl: oidc.discoveryUrl,
            clientId: oidc.clientId,
            clientSecret: oidc.clientSecret,
            scopes: ['openid', 'profile', 'email'],
            mapProfileToUser: async (profile) => {
              const subject = typeof profile.sub === 'string' ? profile.sub : ''
              if (!subject) {
                throw new APIError('BAD_REQUEST', {
                  message: 'The OIDC provider did not return a subject identifier.'
                })
              }
              if (
                typeof profile.email !== 'string' ||
                !profile.email.trim() ||
                typeof profile.name !== 'string' ||
                !profile.name.trim()
              ) {
                throw new APIError('BAD_REQUEST', {
                  message: 'The OIDC provider did not return the required profile claims.'
                })
              }
              const currentOidc = await getOidcConfig()
              if (currentOidc.discoveryUrl !== oidc.discoveryUrl) {
                throw new APIError('FORBIDDEN', { message: 'The OIDC provider has changed.' })
              }
              if (!(await claimOidcSubject(oidc.discoveryUrl, subject))) {
                throw new APIError('FORBIDDEN', {
                  message: 'This OIDC account is not authorized.'
                })
              }
              return { id: subject }
            }
          }
        ]
      }),
      sveltekitCookies(getRequestEvent) // make sure this is the last plugin in the array
    ]
  })
}

export async function getAuth(): Promise<AuthInstance> {
  if (!_auth) {
    _auth = await createAuth()
  }
  return _auth
}

export function invalidateAuth() {
  _auth = null
}
