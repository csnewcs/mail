import { db } from './db'
import { imapJob } from './db/schema'

export async function enqueueMarkRead(uid: number, mailbox: string) {
  const now = new Date()
  await db
    .insert(imapJob)
    .values({
      type: 'mark_read',
      mailbox,
      uid,
      targetMailbox: null,
      status: 'pending',
      dedupeKey: `mark_read:${mailbox}:${uid}`,
      attemptCount: 0,
      availableAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: imapJob.dedupeKey,
      set: {
        status: 'pending',
        attemptCount: 0,
        availableAt: now,
        lastError: null,
        updatedAt: now
      }
    })
}

export async function enqueueMarkUnread(uid: number, mailbox: string) {
  const now = new Date()
  await db
    .insert(imapJob)
    .values({
      type: 'mark_unread',
      mailbox,
      uid,
      targetMailbox: null,
      status: 'pending',
      dedupeKey: `mark_unread:${mailbox}:${uid}`,
      attemptCount: 0,
      availableAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: imapJob.dedupeKey,
      set: {
        status: 'pending',
        attemptCount: 0,
        availableAt: now,
        lastError: null,
        updatedAt: now
      }
    })
}

export async function enqueueMoveMessage(
  uid: number,
  sourceMailbox: string,
  targetMailbox: string
) {
  const now = new Date()
  await db
    .insert(imapJob)
    .values({
      type: 'move',
      mailbox: sourceMailbox,
      uid,
      targetMailbox,
      status: 'pending',
      dedupeKey: `move:${sourceMailbox}:${uid}`,
      attemptCount: 0,
      availableAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: imapJob.dedupeKey,
      set: {
        targetMailbox,
        status: 'pending',
        attemptCount: 0,
        availableAt: now,
        lastError: null,
        updatedAt: now
      }
    })
}

export async function enqueueAddFlag(uid: number, mailbox: string, flag: string) {
  const now = new Date()
  await db
    .insert(imapJob)
    .values({
      type: 'add_flag',
      mailbox,
      uid,
      targetMailbox: flag,
      status: 'pending',
      dedupeKey: `add_flag:${mailbox}:${uid}:${flag}`,
      attemptCount: 0,
      availableAt: now,
      lastError: null,
      createdAt: now,
      updatedAt: now
    })
    .onConflictDoUpdate({
      target: imapJob.dedupeKey,
      set: {
        targetMailbox: flag,
        status: 'pending',
        attemptCount: 0,
        availableAt: now,
        lastError: null,
        updatedAt: now
      }
    })
}
