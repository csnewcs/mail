import { isAlwaysReadMailbox } from './mailbox.ts'

type MessageCopy = {
  messageId: string
  mailbox: string
  flags: string
}

export function isSeenFlags(flags: string) {
  return (JSON.parse(flags) as string[]).includes('\\Seen')
}

export function unreadMessageRows<T extends { flags: string }>(rows: T[]) {
  return rows.filter((row) => !isSeenFlags(row.flags))
}

export function changedReadStateCopies<T extends MessageCopy>(
  rows: T[],
  messageIds: ReadonlySet<string>,
  seen: boolean
) {
  return rows.flatMap((row) => {
    if (!messageIds.has(row.messageId) || (!seen && isAlwaysReadMailbox(row.mailbox))) return []

    const flags = JSON.parse(row.flags) as string[]
    if (isSeenFlags(row.flags) === seen) return []

    return [
      {
        ...row,
        flags: JSON.stringify(
          seen ? [...flags, '\\Seen'] : flags.filter((flag) => flag !== '\\Seen')
        )
      }
    ]
  })
}
