export type PushDeliveryResult = 'delivered' | 'retryable' | 'terminal'

export function pushDeliveryComplete(results: PushDeliveryResult[]) {
  return results.includes('delivered') || (results.length > 0 && !results.includes('retryable'))
}
