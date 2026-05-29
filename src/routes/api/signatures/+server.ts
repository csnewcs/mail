import { json, error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailSignature } from '$lib/server/db/schema'
import { getSignatureProfiles, invalidateConfigCache } from '$lib/server/config'
import { isDemoModeEnabled, saveDemoSettings } from '$lib/server/demo'

function normalizeSignatures(body: unknown) {
  const signatures = Array.isArray(body)
    ? body
    : body &&
        typeof body === 'object' &&
        Array.isArray((body as Record<string, unknown>).signatures)
      ? ((body as Record<string, unknown>).signatures as unknown[])
      : null

  if (!signatures) return null

  const normalized = signatures
    .filter(
      (signature): signature is Record<string, unknown> =>
        Boolean(signature) && typeof signature === 'object'
    )
    .map((signature, index) => ({
      id: typeof signature.id === 'number' && signature.id > 0 ? signature.id : undefined,
      name:
        typeof signature.name === 'string' && signature.name.trim()
          ? signature.name.trim()
          : `Signature ${index + 1}`,
      html: typeof signature.html === 'string' ? signature.html : '',
      isDefault: signature.isDefault === true
    }))

  if (normalized.length > 0 && !normalized.some((signature) => signature.isDefault)) {
    normalized[0].isDefault = true
  }

  return normalized
}

export const GET: RequestHandler = async () => {
  return json({ signatures: await getSignatureProfiles() })
}

export const POST: RequestHandler = async ({ request }) => {
  const signatures = normalizeSignatures(await request.json())
  if (!signatures) return error(400, 'Expected signatures array')

  if (isDemoModeEnabled()) {
    saveDemoSettings({ signatureProfiles: signatures })
    return json({ signatures: await getSignatureProfiles() })
  }

  await db.delete(mailSignature)
  if (signatures.length > 0) {
    await db.insert(mailSignature).values(
      signatures.map((signature) => ({
        name: signature.name,
        html: signature.html,
        isDefault: signature.isDefault,
        updatedAt: new Date()
      }))
    )
  }
  invalidateConfigCache()

  return json({ signatures: await getSignatureProfiles() })
}
