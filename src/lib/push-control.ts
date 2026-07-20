const MAX_MESSAGE_IDS_PER_PUSH = 200
export const READ_CONTROL_VERSION = 1

export function normalizeReadControlVersion(value: unknown) {
  return value === READ_CONTROL_VERSION ? READ_CONTROL_VERSION : 0
}

export function supportsReadControl(version: number) {
  return version >= READ_CONTROL_VERSION
}

export function readControlSubscriptions<T extends { readControlVersion: number }>(
  subscriptions: T[]
) {
  return subscriptions.filter((subscription) =>
    supportsReadControl(subscription.readControlVersion)
  )
}

export function readNotificationBatches(messageIds: number[]) {
  const ids = [...new Set(messageIds.filter((id) => Number.isInteger(id) && id > 0))]
  const batches: number[][] = []
  for (let index = 0; index < ids.length; index += MAX_MESSAGE_IDS_PER_PUSH) {
    batches.push(ids.slice(index, index + MAX_MESSAGE_IDS_PER_PUSH))
  }
  return batches
}
