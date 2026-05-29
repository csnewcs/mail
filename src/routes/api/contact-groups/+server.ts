import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { deleteContactGroup, listContactGroups, saveContactGroup } from '$lib/server/contacts'
import {
  deleteDemoContactGroup,
  isDemoModeEnabled,
  listDemoContactGroups,
  saveDemoContactGroup
} from '$lib/server/demo'

function parseId(url: URL) {
  const id = Number(url.searchParams.get('id'))
  return Number.isFinite(id) && id > 0 ? id : null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function readContactIds(value: unknown) {
  return Array.isArray(value) ? value.map(Number).filter((id) => Number.isFinite(id) && id > 0) : []
}

export const GET: RequestHandler = async ({ url }) => {
  const q = url.searchParams.get('q') ?? ''
  const limit = Number(url.searchParams.get('limit') ?? 100)
  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 100
  const groups = isDemoModeEnabled()
    ? listDemoContactGroups(q, normalizedLimit)
    : await listContactGroups(q, normalizedLimit)
  return json({ groups })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null)
  const name = readString(body?.name)
  if (!name) return error(400, 'Group name is required')

  const payload = {
    name,
    description: readString(body?.description),
    contactIds: readContactIds(body?.contactIds)
  }
  const group = isDemoModeEnabled()
    ? saveDemoContactGroup(payload)
    : await saveContactGroup(payload)
  return json({ group }, { status: 201 })
}

export const PATCH: RequestHandler = async ({ request, url }) => {
  const id = parseId(url)
  if (!id) return error(400, 'Group id is required')

  const body = await request.json().catch(() => null)
  const name = readString(body?.name)
  if (!name) return error(400, 'Group name is required')

  const payload = {
    id,
    name,
    description: readString(body?.description),
    contactIds: readContactIds(body?.contactIds)
  }
  const group = isDemoModeEnabled()
    ? saveDemoContactGroup(payload)
    : await saveContactGroup(payload)
  return json({ group })
}

export const DELETE: RequestHandler = async ({ url }) => {
  const id = parseId(url)
  if (!id) return error(400, 'Group id is required')

  if (isDemoModeEnabled()) deleteDemoContactGroup(id)
  else await deleteContactGroup(id)

  return json({ success: true })
}
