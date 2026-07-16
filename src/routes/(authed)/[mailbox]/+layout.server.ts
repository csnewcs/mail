import type { LayoutServerLoad } from './$types'
import { getMailboxSyncStatus, resolveMailboxPath } from '$lib/server/mail'
import { payloadBytes, perfLog, perfMs, perfNow } from '$lib/server/perf'
import { getStoredPreferences } from '$lib/server/preferences'

export const load: LayoutServerLoad = async ({ params, parent }) => {
  const startedAt = perfNow()
  const [{ imapMailboxes }, preferences] = await Promise.all([parent(), getStoredPreferences()])
  const mailboxPath = await resolveMailboxPath(params.mailbox, imapMailboxes)

  const sync = await getMailboxSyncStatus(mailboxPath)

  const body = {
    sync,
    simplifiedView: preferences.simplifiedView,
    density: preferences.density,
    compactMode: preferences.density !== 'comfortable',
    threadModeOnPageLoad: preferences.threadModeOnPageLoad,
    listRatio: preferences.listRatio
  }

  perfLog('load.mailboxLayout', {
    mailbox: mailboxPath,
    payloadBytes: payloadBytes(body),
    ms: perfMs(startedAt)
  })

  return body
}
