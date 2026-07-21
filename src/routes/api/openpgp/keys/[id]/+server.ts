import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { deleteOpenPgpKey } from '$lib/server/openpgp-keys'

export const DELETE: RequestHandler = async ({ params }) => {
  const id = Number(params.id)
  if (!Number.isInteger(id) || id <= 0) return error(400, 'Invalid key ID')
  if (!(await deleteOpenPgpKey(id))) return error(404, 'OpenPGP key not found')
  return json({ success: true })
}
