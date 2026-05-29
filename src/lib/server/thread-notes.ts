import { eq } from 'drizzle-orm'
import { db } from './db'
import { mailThreadNote } from './db/schema'
import { isDemoModeEnabled } from './demo'

const demoThreadNotes = new Map<string, ThreadNote>()

export type ThreadNote = {
  threadKey: string
  body: string
  createdAt: Date
  updatedAt: Date
}

export async function getThreadNote(threadKey: string): Promise<ThreadNote | null> {
  if (isDemoModeEnabled()) return demoThreadNotes.get(threadKey) ?? null

  const [note] = await db
    .select()
    .from(mailThreadNote)
    .where(eq(mailThreadNote.threadKey, threadKey))
    .limit(1)

  return note ?? null
}

export async function saveThreadNote(threadKey: string, body: string): Promise<ThreadNote | null> {
  const trimmedBody = body.trim()

  if (!trimmedBody) {
    await deleteThreadNote(threadKey)
    return null
  }

  const now = new Date()

  if (isDemoModeEnabled()) {
    const existing = demoThreadNotes.get(threadKey)
    const note = {
      threadKey,
      body: trimmedBody,
      createdAt: existing?.createdAt ?? now,
      updatedAt: now
    }
    demoThreadNotes.set(threadKey, note)
    return note
  }

  const [note] = await db
    .insert(mailThreadNote)
    .values({ threadKey, body: trimmedBody, updatedAt: now })
    .onConflictDoUpdate({
      target: mailThreadNote.threadKey,
      set: { body: trimmedBody, updatedAt: now }
    })
    .returning()

  return note ?? null
}

export async function deleteThreadNote(threadKey: string) {
  if (isDemoModeEnabled()) {
    demoThreadNotes.delete(threadKey)
    return
  }

  await db.delete(mailThreadNote).where(eq(mailThreadNote.threadKey, threadKey))
}

export function serializeThreadNote(note: ThreadNote | null) {
  if (!note) return null

  return {
    threadKey: note.threadKey,
    body: note.body,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString()
  }
}
