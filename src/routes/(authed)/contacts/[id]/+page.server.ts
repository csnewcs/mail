import { error } from '@sveltejs/kit'
import type { PageServerLoad } from './$types'
import { getContactById, listMessagesForContact } from '$lib/server/contacts'
import { getDemoContactById, isDemoModeEnabled, listDemoMessagesForContact } from '$lib/server/demo'

function parseId(value: string) {
  const id = Number(value)
  return Number.isInteger(id) && id > 0 ? id : null
}

export const load: PageServerLoad = async ({ params }) => {
  const id = parseId(params.id)
  if (!id) error(400, 'Contact id is required')

  const contact = isDemoModeEnabled() ? getDemoContactById(id) : await getContactById(id)
  if (!contact) error(404, 'Contact not found')

  const messages = isDemoModeEnabled()
    ? listDemoMessagesForContact(contact.email)
    : await listMessagesForContact(contact.email)

  return { contact, messages }
}
