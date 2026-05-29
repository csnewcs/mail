import { isAlwaysReadMailbox } from '$lib/mailbox'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { mailboxNotificationSetting } from './db/schema'

export type MailboxNotificationRule = {
  mailbox: string
  enabled: boolean
  canNotify: boolean
}

export async function shouldSendMailboxNotifications(mailbox: string): Promise<boolean> {
  if (isAlwaysReadMailbox(mailbox)) return false

  const [setting] = await db
    .select({ enabled: mailboxNotificationSetting.enabled })
    .from(mailboxNotificationSetting)
    .where(eq(mailboxNotificationSetting.mailbox, mailbox))
    .limit(1)

  return setting?.enabled ?? true
}

export async function getMailboxNotificationRules(
  mailboxes: { path: string }[]
): Promise<MailboxNotificationRule[]> {
  const settings = await db.select().from(mailboxNotificationSetting)
  const enabledByMailbox = new Map(settings.map((setting) => [setting.mailbox, setting.enabled]))

  return mailboxes.map(({ path }) => ({
    mailbox: path,
    enabled: enabledByMailbox.get(path) ?? true,
    canNotify: !isAlwaysReadMailbox(path)
  }))
}

export async function setMailboxNotificationRule(mailbox: string, enabled: boolean): Promise<void> {
  await db
    .insert(mailboxNotificationSetting)
    .values({ mailbox, enabled, updatedAt: new Date() })
    .onConflictDoUpdate({
      target: mailboxNotificationSetting.mailbox,
      set: { enabled, updatedAt: new Date() }
    })
}
