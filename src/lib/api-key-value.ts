import { createHash, randomBytes } from 'node:crypto'

export const API_KEY_PREFIX = 'pmail_'

export function generateApiKeyValue() {
  return `${API_KEY_PREFIX}${randomBytes(32).toString('base64url')}`
}

export function hashApiKey(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

export function bearerApiKey(headers: Headers) {
  const authorization = headers.get('authorization') ?? ''
  const match = authorization.match(/^Bearer\s+(.+)$/i)
  return match?.[1]?.trim() ?? null
}
