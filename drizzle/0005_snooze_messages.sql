ALTER TABLE "mail_message_mailbox" ADD COLUMN "snoozed_until" timestamp with time zone;
CREATE INDEX "mail_message_mailbox_mailbox_snoozed_until_idx" ON "mail_message_mailbox" USING btree ("mailbox","snoozed_until");
