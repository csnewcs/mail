import { and, asc, count, eq, lte } from 'drizzle-orm'
import { ImapFlow } from 'imapflow'
import { getImapConfig, getImapConfigs, type ImapConfig } from './config'
import { db } from './db'
import { imapJob } from './db/schema'
import { logServerError } from './perf'
import { isAuthError, withRetry } from './retry'

const IMAP_CONNECT_TIMEOUT_MS = 20_000
const MAX_JOB_ATTEMPTS = 8
const PERMANENT_JOB_ERROR_RE =
  /\b(no such mailbox|unknown mailbox|invalid mailbox|mailbox does not exist)\b/i

type MailConfig = Pick<ImapConfig, 'host' | 'port' | 'secure' | 'user' | 'password'>
type ImapJobRow = typeof imapJob.$inferSelect

type ResolvedImapJob = { config: MailConfig; mailbox: string; targetMailbox: string | null }

let drainInFlight = false

async function connectImap(config: MailConfig, label: string): Promise<ImapFlow> {
  return withRetry(
    async () => {
      const client = new ImapFlow({
        host: config.host,
        port: config.port,
        secure: config.secure,
        auth: { user: config.user, pass: config.password },
        logger: false,
        connectionTimeout: IMAP_CONNECT_TIMEOUT_MS
      })
      try {
        await client.connect()
        return client
      } catch (err) {
        try {
          client.close()
        } catch {
          /* ignore */
        }
        throw err
      }
    },
    { label, maxAttempts: 3, baseDelayMs: 1000 }
  )
}

function nextAttemptDelayMs(attemptCount: number) {
  return Math.min(5 * 60_000, 1_000 * 2 ** Math.min(attemptCount, 8))
}

function isPermanentJobError(error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  return isAuthError(error) || PERMANENT_JOB_ERROR_RE.test(message)
}

function toConfig(config: ImapConfig): MailConfig {
  return {
    host: config.host,
    port: config.port,
    secure: config.secure,
    user: config.user,
    password: config.password
  }
}

async function resolveJobTarget(job: ImapJobRow): Promise<ResolvedImapJob> {
  const configs = await getImapConfigs()
  if (configs.length === 0) {
    const config = await getImapConfig()
    if ('missing' in config) throw new Error(`Missing IMAP config: ${config.missing.join(', ')}`)
    configs.push(config)
  }

  for (const config of configs) {
    const prefix = `${config.name}/`
    if (config.id !== 'primary' && job.mailbox.startsWith(prefix)) {
      return {
        config: toConfig(config),
        mailbox: job.mailbox.slice(prefix.length),
        targetMailbox: job.targetMailbox?.startsWith(prefix)
          ? job.targetMailbox.slice(prefix.length)
          : job.targetMailbox
      }
    }
  }

  return { config: toConfig(configs[0]), mailbox: job.mailbox, targetMailbox: job.targetMailbox }
}

async function markJobRunning(job: ImapJobRow) {
  await db
    .update(imapJob)
    .set({
      status: 'running',
      updatedAt: new Date(),
      lastError: null
    })
    .where(eq(imapJob.id, job.id))
}

async function markJobDone(job: ImapJobRow) {
  await db
    .update(imapJob)
    .set({
      status: 'done',
      updatedAt: new Date(),
      lastError: null
    })
    .where(eq(imapJob.id, job.id))
}

async function failJob(job: ImapJobRow, error: unknown) {
  const message = error instanceof Error ? error.message : String(error)
  const attemptCount = job.attemptCount + 1

  if (isPermanentJobError(error) || attemptCount >= MAX_JOB_ATTEMPTS) {
    await db
      .update(imapJob)
      .set({
        status: 'failed',
        attemptCount,
        updatedAt: new Date(),
        lastError: message
      })
      .where(eq(imapJob.id, job.id))
    return
  }

  await db
    .update(imapJob)
    .set({
      status: 'pending',
      attemptCount,
      updatedAt: new Date(),
      availableAt: new Date(Date.now() + nextAttemptDelayMs(attemptCount)),
      lastError: message
    })
    .where(eq(imapJob.id, job.id))
}

async function runMarkRead(config: MailConfig, job: ImapJobRow, mailbox = job.mailbox) {
  let client: ImapFlow | null = null
  try {
    client = await connectImap(config, `mark-read ${mailbox}`)
    const lock = await client.getMailboxLock(mailbox)
    try {
      await client.messageFlagsAdd(String(job.uid), ['\\Seen'], { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {
        /* ignore */
      }
    }
  }
}

async function runMarkUnread(config: MailConfig, job: ImapJobRow, mailbox = job.mailbox) {
  let client: ImapFlow | null = null
  try {
    client = await connectImap(config, `mark-unread ${mailbox}`)
    const lock = await client.getMailboxLock(mailbox)
    try {
      await client.messageFlagsRemove(String(job.uid), ['\\Seen'], { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {
        /* ignore */
      }
    }
  }
}

async function runMove(
  config: MailConfig,
  job: ImapJobRow,
  mailbox = job.mailbox,
  targetMailbox = job.targetMailbox
) {
  if (!targetMailbox) {
    throw new Error('Missing target mailbox for move job')
  }

  let client: ImapFlow | null = null
  try {
    client = await connectImap(config, `move ${mailbox} to ${targetMailbox}`)
    const lock = await client.getMailboxLock(mailbox)
    try {
      await client.messageMove(String(job.uid), targetMailbox, { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {
        /* ignore */
      }
    }
  }
}

async function runAddFlag(
  config: MailConfig,
  job: ImapJobRow,
  mailbox = job.mailbox,
  targetMailbox = job.targetMailbox
) {
  if (!targetMailbox) {
    throw new Error('Missing flag for add-flag job')
  }

  let client: ImapFlow | null = null
  try {
    client = await connectImap(config, `add-flag ${mailbox}`)
    const lock = await client.getMailboxLock(mailbox)
    try {
      await client.messageFlagsAdd(String(job.uid), [targetMailbox], { uid: true })
    } finally {
      lock.release()
    }
  } finally {
    if (client) {
      try {
        await client.logout()
      } catch {
        /* ignore */
      }
    }
  }
}

async function runJob(job: ImapJobRow) {
  const target = await resolveJobTarget(job)

  if (job.type === 'mark_read') {
    await runMarkRead(target.config, job, target.mailbox)
    return
  }

  if (job.type === 'mark_unread') {
    await runMarkUnread(target.config, job, target.mailbox)
    return
  }

  if (job.type === 'move') {
    await runMove(target.config, job, target.mailbox, target.targetMailbox)
    return
  }

  if (job.type === 'add_flag') {
    await runAddFlag(target.config, job, target.mailbox, target.targetMailbox)
    return
  }

  throw new Error(`Unknown IMAP job type: ${job.type}`)
}

async function drainQueueOnce(): Promise<boolean> {
  const [job] = await db
    .select()
    .from(imapJob)
    .where(and(eq(imapJob.status, 'pending'), lte(imapJob.availableAt, new Date())))
    .orderBy(asc(imapJob.availableAt), asc(imapJob.createdAt))
    .limit(1)

  if (!job) return false

  await markJobRunning(job)

  try {
    await runJob(job)
    await markJobDone(job)
  } catch (error) {
    logServerError(`imapQueue.${job.type}`, error, {
      mailbox: job.mailbox,
      uid: job.uid,
      targetMailbox: job.targetMailbox ?? null,
      attemptCount: job.attemptCount
    })
    await failJob(job, error)
  }

  return true
}

export async function recoverInterruptedImapJobs() {
  await db
    .update(imapJob)
    .set({ status: 'pending', updatedAt: new Date() })
    .where(eq(imapJob.status, 'running'))
}

export async function hasReadyImapJobs() {
  const [row] = await db
    .select({ value: count() })
    .from(imapJob)
    .where(and(eq(imapJob.status, 'pending'), lte(imapJob.availableAt, new Date())))
  return Number(row?.value ?? 0) > 0
}

export async function drainImapQueue() {
  if (drainInFlight) return 0
  drainInFlight = true

  let processed = 0
  try {
    while (await drainQueueOnce()) {
      processed += 1
    }
  } finally {
    drainInFlight = false
  }

  return processed
}
