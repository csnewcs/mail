import { error } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { getOpenPgpPublicKey } from '$lib/server/openpgp-keys'

export const GET: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return error(400, 'Invalid key ID')
  const key = await getOpenPgpPublicKey(id)
  if (!key) return error(404, 'OpenPGP key not found')
  return new Response(key.publicKey, {
    headers: {
      'Content-Type': 'application/pgp-keys; charset=utf-8',
      'Content-Disposition': `attachment; filename="public-key-${key.fingerprint.slice(-16)}.asc"`,
      'Cache-Control': 'private, no-store'
    }
  })
}
