import 'dotenv/config'
import { setTimeout as delay } from 'node:timers/promises'
import { isDemoModeEnabled } from './lib/server/demo'
import { runMigrations } from './lib/server/db'
import { drainImapQueue, recoverInterruptedImapJobs } from './lib/server/imap-worker'
import {
  getMailboxSyncPollMs,
  repairThreadKeys,
  runMailboxSyncOnce,
  touchSyncWorkerHeartbeat
} from './lib/server/mail'
import {
  drainSmtpQueue,
  hasUnfinishedSmtpJobs,
  recoverInterruptedSmtpJobs
} from './lib/server/smtp-worker'

const WORKER_TICK_MS = 1_000
const HEARTBEAT_MS = 30_000

let tickInFlight = false
let stopping = false
let lastHeartbeatAt = 0
let lastSyncAttemptAt = 0

async function heartbeat() {
  if (Date.now() - lastHeartbeatAt < HEARTBEAT_MS) return
  await touchSyncWorkerHeartbeat()
  lastHeartbeatAt = Date.now()
}

async function maybeRunSync() {
  const pollMs = await getMailboxSyncPollMs()
  if (pollMs === null) return
  if (Date.now() - lastSyncAttemptAt < pollMs) return

  await drainImapQueue()
  if (await hasUnfinishedSmtpJobs()) return

  lastSyncAttemptAt = Date.now()
  await runMailboxSyncOnce({
    beforeMailbox: async () => {
      await drainImapQueue()
    }
  })
}

async function tick() {
  if (tickInFlight || stopping) return
  tickInFlight = true

  try {
    await heartbeat()
    await drainImapQueue()
    await drainSmtpQueue()

    // The sync clock is paused while SMTP jobs are pending/running/retrying.
    if (await hasUnfinishedSmtpJobs()) return

    await maybeRunSync()
  } catch (error) {
    console.error('[worker] tick failed:', error)
  } finally {
    tickInFlight = false
  }
}

async function main() {
  if (isDemoModeEnabled()) {
    console.log('[worker] demo mode enabled; worker is not required')
    return
  }

  await runMigrations()
  await repairThreadKeys()
  await recoverInterruptedImapJobs()
  await recoverInterruptedSmtpJobs()

  console.log('[worker] started')
  while (!stopping) {
    await tick()
    await delay(WORKER_TICK_MS)
  }
}

function stop() {
  stopping = true
}

process.on('SIGINT', stop)
process.on('SIGTERM', stop)

main().catch((error) => {
  console.error('[worker] fatal:', error)
  process.exit(1)
})
