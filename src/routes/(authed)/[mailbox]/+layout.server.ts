import type { LayoutServerLoad } from './$types'
import { getMailboxSyncStatus, resolveMailboxScope } from '$lib/server/mail'
import { payloadBytes, perfLog, perfMs, perfNow } from '$lib/server/perf'
import { getStoredPreferences } from '$lib/server/preferences'

export const load: LayoutServerLoad = async ({ params, parent }) => {
  const startedAt = perfNow()
  const [{ imapMailboxes }, preferences] = await Promise.all([parent(), getStoredPreferences()])
  const scope = await resolveMailboxScope(params.mailbox, imapMailboxes)

  const statuses = await Promise.all(scope.paths.map(getMailboxSyncStatus))
  const latestSync =
    statuses
      .map((status) => status.lastSyncedAt)
      .filter((value): value is string => value !== null)
      .sort()
      .at(-1) ?? null
  const sync = scope.composedMailbox
    ? {
        mailbox: scope.path,
        configured: statuses.every((status) => status.configured),
        skipped: statuses.every((status) => status.skipped),
        syncing: statuses.some((status) => status.syncing),
        fetchedCount: statuses.reduce((total, status) => total + status.fetchedCount, 0),
        storedCount: statuses.reduce((total, status) => total + status.storedCount, 0),
        lastSyncedAt: latestSync,
        lastError: statuses.find((status) => status.lastError)?.lastError ?? null,
        reason: `Combined from ${scope.paths.length} mailboxes.`
      }
    : statuses[0]

  const body = {
    sync,
    composedMailbox: scope.composedMailbox,
    mailboxPaths: scope.paths,
    simplifiedView: preferences.simplifiedView,
    density: preferences.density,
    compactMode: preferences.density !== 'comfortable',
    threadModeOnPageLoad: preferences.threadModeOnPageLoad,
    listRatio: preferences.listRatio
  }

  perfLog('load.mailboxLayout', {
    mailbox: scope.path,
    payloadBytes: payloadBytes(body),
    ms: perfMs(startedAt)
  })

  return body
}
