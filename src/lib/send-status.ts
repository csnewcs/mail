export type SendStatus = 'sending' | 'failed' | 'sent'

export function sendStatusFromJobStatus(
  status: string,
  deliveredAt?: Date | string | null
): SendStatus | null {
  if (deliveredAt) return 'sent'
  if (status === 'pending' || status === 'running') return 'sending'
  if (status === 'failed') return 'failed'
  if (status === 'done') return 'sent'
  return null
}

export function sendStatusLabel(status: SendStatus, openedAt?: Date | string | null) {
  return status === 'sent' && openedAt ? '[read]' : `[${status}]`
}
