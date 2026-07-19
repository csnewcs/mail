const MAX_MESSAGE_IDS_PER_PUSH = 200

export function readNotificationBatches(messageIds: number[]) {
  const ids = [...new Set(messageIds.filter((id) => Number.isInteger(id) && id > 0))]
  const batches: number[][] = []
  for (let index = 0; index < ids.length; index += MAX_MESSAGE_IDS_PER_PUSH) {
    batches.push(ids.slice(index, index + MAX_MESSAGE_IDS_PER_PUSH))
  }
  return batches
}
