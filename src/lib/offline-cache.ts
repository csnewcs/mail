const DB_NAME = 'pmail-offline-read-cache'
const DB_VERSION = 1
const MESSAGE_STORE = 'messages'
const LIST_STORE = 'lists'
const MAX_MESSAGES = 75
const MAX_LISTS = 12

export type OfflineListMessage = {
  id: number
  messageId?: string
  uid: number
  subject: string | null
  from: string | null
  to: string | null
  preview: string | null
  flags: string[]
  hasUnread?: boolean
  important?: boolean
  hasImportantUnread?: boolean
  receivedAt: string | null
  mailbox?: string
  threadId?: string | null
  threadCount?: number
}

export type OfflineMessage = OfflineListMessage & {
  messageId: string
  mailbox: string
  cc: string | null
  replyTo: string | null
  htmlContent: string | null
  textContent: string | null
  inReplyTo: string | null
  references: string | null
}

export type OfflineAttachmentMeta = {
  id: number
  filename: string
  contentType: string
  size: number
}

export type OfflineListCache = {
  key: string
  userKey: string
  mailbox: string
  messages: OfflineListMessage[]
  hasMore: boolean
  pageSize: number
  total: number
  threaded: boolean
  savedAt: number
}

export type OfflineMessageCache = {
  key: string
  userKey: string
  message: OfflineMessage
  mailboxRole: 'inbox' | 'archive' | 'trash' | 'spam' | null
  attachments: OfflineAttachmentMeta[]
  savedAt: number
}

function canUseIndexedDb() {
  return typeof window !== 'undefined' && 'indexedDB' in window
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (!canUseIndexedDb()) {
      reject(new Error('IndexedDB is unavailable.'))
      return
    }

    const request = indexedDB.open(DB_NAME, DB_VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(MESSAGE_STORE)) db.createObjectStore(MESSAGE_STORE)
      if (!db.objectStoreNames.contains(LIST_STORE)) db.createObjectStore(LIST_STORE)
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error ?? new Error('Failed to open offline cache.'))
  })
}

async function withStore<T>(
  storeName: string,
  mode: IDBTransactionMode,
  callback: (store: IDBObjectStore) => IDBRequest<T> | void
): Promise<T | undefined> {
  const db = await openDb()
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(storeName, mode)
    const store = transaction.objectStore(storeName)
    const request = callback(store)
    let result: T | undefined

    if (request) {
      request.onsuccess = () => {
        result = request.result
      }
      request.onerror = () => reject(request.error ?? new Error('Offline cache request failed.'))
    }

    transaction.oncomplete = () => {
      db.close()
      resolve(result)
    }
    transaction.onerror = () => {
      db.close()
      reject(transaction.error ?? new Error('Offline cache transaction failed.'))
    }
  })
}

function listKey(userKey: string, mailbox: string, threaded: boolean) {
  return `${userKey}:${mailbox}:${threaded ? 'threaded' : 'messages'}`
}

function messageKey(userKey: string, id: number | string) {
  return `${userKey}:${id}`
}

async function trimStore(storeName: string, maxEntries: number) {
  try {
    const db = await openDb()
    await new Promise<void>((resolve, reject) => {
      const transaction = db.transaction(storeName, 'readwrite')
      const store = transaction.objectStore(storeName)
      const request = store.getAll()
      request.onsuccess = () => {
        const rows = (request.result as { key: string; savedAt: number }[]).sort(
          (a, b) => b.savedAt - a.savedAt
        )
        for (const row of rows.slice(maxEntries)) store.delete(row.key)
      }
      request.onerror = () => reject(request.error ?? new Error('Failed to trim offline cache.'))
      transaction.oncomplete = () => {
        db.close()
        resolve()
      }
      transaction.onerror = () => {
        db.close()
        reject(transaction.error ?? new Error('Failed to trim offline cache.'))
      }
    })
  } catch {
    // Offline cache is best effort.
  }
}

export async function saveOfflineList(input: Omit<OfflineListCache, 'key' | 'savedAt'>) {
  try {
    const key = listKey(input.userKey, input.mailbox, input.threaded)
    await withStore(LIST_STORE, 'readwrite', (store) =>
      store.put({ ...input, key, savedAt: Date.now() }, key)
    )
    await trimStore(LIST_STORE, MAX_LISTS)
  } catch {
    // Offline cache is best effort.
  }
}

export async function readOfflineList(userKey: string, mailbox: string, threaded: boolean) {
  try {
    return await withStore<OfflineListCache>(LIST_STORE, 'readonly', (store) =>
      store.get(listKey(userKey, mailbox, threaded))
    )
  } catch {
    return undefined
  }
}

export async function saveOfflineMessage(input: Omit<OfflineMessageCache, 'key' | 'savedAt'>) {
  try {
    const key = messageKey(input.userKey, input.message.id)
    await withStore(MESSAGE_STORE, 'readwrite', (store) =>
      store.put({ ...input, key, savedAt: Date.now() }, key)
    )
    await trimStore(MESSAGE_STORE, MAX_MESSAGES)
  } catch {
    // Offline cache is best effort.
  }
}

export async function readOfflineMessage(userKey: string, id: number | string) {
  try {
    return await withStore<OfflineMessageCache>(MESSAGE_STORE, 'readonly', (store) =>
      store.get(messageKey(userKey, id))
    )
  } catch {
    return undefined
  }
}

export async function clearOfflineCache() {
  if (!canUseIndexedDb()) return
  await new Promise<void>((resolve) => {
    const request = indexedDB.deleteDatabase(DB_NAME)
    request.onsuccess = () => resolve()
    request.onerror = () => resolve()
    request.onblocked = () => resolve()
  })
}
