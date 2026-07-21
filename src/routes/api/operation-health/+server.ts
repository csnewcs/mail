import { json } from '@sveltejs/kit'
import type { RequestHandler } from './$types'
import { db } from '$lib/server/db'
import { imapJob, smtpJob, syncRuntime } from '$lib/server/db/schema'
import { isDemoModeEnabled } from '$lib/server/demo'
import { count, desc, sql } from 'drizzle-orm'

const STALE_HEARTBEAT_MS = 90_000

function iso(value: Date | null | undefined) {
  return value?.toISOString() ?? null
}

function statusFromHeartbeat(value: Date | null | undefined) {
  if (!value) return 'unknown'
  return Date.now() - value.getTime() > STALE_HEARTBEAT_MS ? 'stale' : 'online'
}

function emptyCounts() {
  return {
    pending: 0,
    running: 0,
    done: 0,
    failed: 0,
    other: 0,
    total: 0
  }
}

function normalizeCounts(rows: Array<{ status: string; value: number }>) {
  const counts = emptyCounts()
  for (const row of rows) {
    const value = Number(row.value ?? 0)
    counts.total += value
    if (row.status === 'pending') counts.pending += value
    else if (row.status === 'running') counts.running += value
    else if (row.status === 'done') counts.done += value
    else if (row.status === 'failed') counts.failed += value
    else counts.other += value
  }
  return counts
}

function demoHealth() {
  const now = new Date()
  const started = new Date(now.getTime() - 18_000)
  const heartbeat = new Date(now.getTime() - 12_000)

  return {
    generatedAt: now.toISOString(),
    worker: {
      status: 'online',
      heartbeatAt: heartbeat.toISOString(),
      heartbeatAgeMs: now.getTime() - heartbeat.getTime(),
      isSyncing: true,
      activeMailbox: 'INBOX',
      activeStored: 32,
      activeTotal: 80,
      lastRunStartedAt: started.toISOString(),
      lastRunFinishedAt: new Date(now.getTime() - 180_000).toISOString(),
      lastError: null
    },
    operations: {
      imap: { pending: 2, running: 1, done: 148, failed: 0, other: 0, total: 151 },
      smtp: { pending: 1, running: 0, done: 24, failed: 1, other: 0, total: 26 }
    },
    recentErrors: [
      {
        channel: 'smtp',
        id: 42,
        type: 'send',
        status: 'failed',
        mailbox: null,
        uid: null,
        attemptCount: 8,
        lastError: 'Demo failed delivery: mailbox unavailable',
        updatedAt: new Date(now.getTime() - 240_000).toISOString(),
        availableAt: new Date(now.getTime() - 240_000).toISOString()
      }
    ]
  }
}

export const GET: RequestHandler = async () => {
  if (isDemoModeEnabled()) return json(demoHealth())

  const [runtimeRow, imapRows, smtpRows, failedImap, failedSmtp] = await Promise.all([
    db.select().from(syncRuntime).limit(1),
    db.select({ status: imapJob.status, value: count() }).from(imapJob).groupBy(imapJob.status),
    db.select({ status: smtpJob.status, value: count() }).from(smtpJob).groupBy(smtpJob.status),
    db
      .select({
        id: imapJob.id,
        type: imapJob.type,
        status: imapJob.status,
        mailbox: imapJob.mailbox,
        uid: imapJob.uid,
        attemptCount: imapJob.attemptCount,
        lastError: imapJob.lastError,
        updatedAt: imapJob.updatedAt,
        availableAt: imapJob.availableAt
      })
      .from(imapJob)
      .where(sql`${imapJob.lastError} is not null`)
      .orderBy(desc(imapJob.updatedAt))
      .limit(6),
    db
      .select({
        id: smtpJob.id,
        status: smtpJob.status,
        attemptCount: smtpJob.attemptCount,
        lastError: smtpJob.lastError,
        updatedAt: smtpJob.updatedAt,
        availableAt: smtpJob.availableAt
      })
      .from(smtpJob)
      .where(sql`${smtpJob.lastError} is not null`)
      .orderBy(desc(smtpJob.updatedAt))
      .limit(6)
  ])

  const runtime = runtimeRow[0]
  const heartbeatAgeMs = runtime?.workerHeartbeatAt
    ? Date.now() - runtime.workerHeartbeatAt.getTime()
    : null

  return json({
    generatedAt: new Date().toISOString(),
    worker: {
      status: statusFromHeartbeat(runtime?.workerHeartbeatAt),
      heartbeatAt: iso(runtime?.workerHeartbeatAt),
      heartbeatAgeMs,
      isSyncing: runtime?.isSyncing ?? false,
      activeMailbox: runtime?.activeMailbox ?? null,
      activeStored: runtime?.activeStored ?? 0,
      activeTotal: runtime?.activeTotal ?? 0,
      lastRunStartedAt: iso(runtime?.lastRunStartedAt),
      lastRunFinishedAt: iso(runtime?.lastRunFinishedAt),
      lastError: runtime?.lastError ?? null
    },
    operations: {
      imap: normalizeCounts(imapRows),
      smtp: normalizeCounts(smtpRows)
    },
    recentErrors: [
      ...failedImap.map((job) => ({
        channel: 'imap' as const,
        id: job.id,
        type: job.type,
        status: job.status,
        mailbox: job.mailbox,
        uid: job.uid,
        attemptCount: job.attemptCount,
        lastError: job.lastError,
        updatedAt: iso(job.updatedAt),
        availableAt: iso(job.availableAt)
      })),
      ...failedSmtp.map((job) => ({
        channel: 'smtp' as const,
        id: job.id,
        type: 'send',
        status: job.status,
        mailbox: null,
        uid: null,
        attemptCount: job.attemptCount,
        lastError: job.lastError,
        updatedAt: iso(job.updatedAt),
        availableAt: iso(job.availableAt)
      }))
    ]
      .sort((a, b) => Date.parse(b.updatedAt ?? '') - Date.parse(a.updatedAt ?? ''))
      .slice(0, 8)
  })
}
