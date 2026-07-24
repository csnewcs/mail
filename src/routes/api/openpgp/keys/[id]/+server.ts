import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { deleteOpenPgpKey, markOpenPgpKeyAsPrimarySigningKey } from '$lib/server/openpgp-keys'

function parseKeyId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const PATCH: RequestHandler = async ({ params }) => {
  const id = parseKeyId(params.id)
  if (id === null) return error(400, 'Invalid key ID')

  const result = await markOpenPgpKeyAsPrimarySigningKey(id)
  if (result === 'not-found') return error(404, 'OpenPGP key not found')
  if (result === 'not-signing-key') {
    return error(400, 'Only an owned private key can be the primary signing key')
  }
  return json({ success: true })
}

export const DELETE: RequestHandler = async ({ params }) => {
  const id = parseKeyId(params.id)
  if (id === null) return error(400, 'Invalid key ID')
  if (!(await deleteOpenPgpKey(id))) return error(404, 'OpenPGP key not found')
  return json({ success: true })
}
