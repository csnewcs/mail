import { error, json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { mailContact } from '$lib/server/db/schema'
import {
  contactCsvInputs,
  deleteContact,
  findContactByEmail,
  importContactsFromMessages,
  listContactGroups,
  listContactsForExport,
  listContacts,
  normalizeEmail,
  previewContactCsv,
  serializeContactsCsv,
  upsertContacts
} from '$lib/server/contacts'
import { eq } from 'drizzle-orm'
import {
  deleteDemoContact,
  findDemoContactByEmail,
  importDemoContactsFromMessages,
  isDemoModeEnabled,
  listDemoContactGroups,
  listDemoContacts,
  updateDemoContact,
  upsertDemoContacts
} from '$lib/server/demo'

function parseId(url: URL) {
  const id = Number(url.searchParams.get('id'))
  return Number.isFinite(id) && id > 0 ? id : null
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

export const GET: RequestHandler = async ({ url }) => {
  if (url.searchParams.get('format') === 'csv') {
    const contacts = isDemoModeEnabled()
      ? listDemoContacts('', 10000)
      : await listContactsForExport()
    return new Response(serializeContactsCsv(contacts), {
      headers: {
        'content-type': 'text/csv; charset=utf-8',
        'content-disposition': 'attachment; filename="contacts.csv"'
      }
    })
  }

  const q = url.searchParams.get('q') ?? ''
  const limit = Number(url.searchParams.get('limit') ?? 50)
  const includeGroups = url.searchParams.get('includeGroups') === '1'
  const normalizedLimit = Number.isFinite(limit) ? Math.min(Math.max(limit, 1), 100) : 50
  if (isDemoModeEnabled()) {
    return json({
      contacts: listDemoContacts(q, normalizedLimit),
      groups: includeGroups ? listDemoContactGroups(q, normalizedLimit) : []
    })
  }
  const contacts = await listContacts(q, normalizedLimit)
  const groups = includeGroups ? await listContactGroups(q, normalizedLimit) : []
  return json({ contacts, groups })
}

export const POST: RequestHandler = async ({ request }) => {
  const body = await request.json().catch(() => null)

  if (body?.action === 'import') {
    if (isDemoModeEnabled()) {
      const imported = await importDemoContactsFromMessages()
      return json({ imported })
    }
    const imported = await importContactsFromMessages()
    return json({ imported })
  }

  if (body?.action === 'preview-csv' || body?.action === 'import-csv') {
    const csv = readString(body?.csv)
    if (!csv) return error(400, 'CSV file is required')
    const preview = previewContactCsv(csv)
    if (body.action === 'preview-csv') return json({ preview })

    const contacts = contactCsvInputs(csv)
    if (contacts.length === 0) return error(400, 'CSV has no valid contacts to import')
    if (isDemoModeEnabled()) {
      await upsertDemoContacts(contacts)
    } else {
      await upsertContacts(contacts)
    }
    return json({ imported: contacts.length, preview })
  }

  const email = normalizeEmail(readString(body?.email))
  if (!email) return error(400, 'Email is required')

  if (isDemoModeEnabled()) {
    await upsertDemoContacts([
      {
        email,
        name: readString(body?.name),
        source: 'manual',
        useCount: 0,
        lastUsedAt: null
      }
    ])
    const contact = findDemoContactByEmail(email)
    return json({ contact }, { status: 201 })
  }

  await upsertContacts([
    {
      email,
      name: readString(body?.name),
      source: 'manual',
      useCount: 0,
      lastUsedAt: null
    }
  ])

  const contact = await findContactByEmail(email)
  return json({ contact }, { status: 201 })
}

export const PATCH: RequestHandler = async ({ request, url }) => {
  const id = parseId(url)
  if (!id) return error(400, 'Contact id is required')

  const body = await request.json().catch(() => null)
  const name = readString(body?.name)
  const email = normalizeEmail(readString(body?.email))
  if (!email) return error(400, 'Email is required')

  if (isDemoModeEnabled()) {
    const contact = updateDemoContact(id, { name, email })
    return json({ contact })
  }

  await db
    .update(mailContact)
    .set({ name, email, source: 'manual', updatedAt: new Date() })
    .where(eq(mailContact.id, id))

  const contact = await findContactByEmail(email)
  return json({ contact })
}

export const DELETE: RequestHandler = async ({ url }) => {
  const id = parseId(url)
  if (!id) return error(400, 'Contact id is required')

  if (isDemoModeEnabled()) {
    deleteDemoContact(id)
    return json({ success: true })
  }

  await deleteContact(id)
  return json({ success: true })
}
