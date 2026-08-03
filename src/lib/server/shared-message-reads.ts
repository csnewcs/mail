export class SharedMessageReads {
  private readonly messageIds = new Map<string, string>()
  private readonly readTokens = new Set<string>()

  add(token: string, messageId: string) {
    this.messageIds.set(token, messageId)
  }

  getMessageId(token: string) {
    return this.messageIds.get(token) ?? null
  }

  markRead(token: string) {
    if (this.messageIds.has(token)) this.readTokens.add(token)
  }

  count(messageId: string) {
    let count = 0
    for (const token of this.readTokens) {
      if (this.messageIds.get(token) === messageId) count += 1
    }
    return count
  }

  clear() {
    this.messageIds.clear()
    this.readTokens.clear()
  }
}
