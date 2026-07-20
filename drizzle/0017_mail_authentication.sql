ALTER TABLE "mail_message_mailbox"
ADD COLUMN "raw_source" bytea;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "uid_validity" bigint;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "raw_source_checked_at" timestamp with time zone;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "raw_source_attempts" integer DEFAULT 0 NOT NULL;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "raw_source_next_attempt_at" timestamp with time zone;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "spf_status" text;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "dkim_status" text;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "dmarc_status" text;

ALTER TABLE "mail_message_mailbox"
ADD COLUMN "authserv_id" text;

ALTER TABLE "mailbox_catalog"
ADD COLUMN "config_id" text;

ALTER TABLE "mailbox_catalog"
ADD COLUMN "remote_path" text;

CREATE INDEX "mail_message_mailbox_raw_pending_idx"
ON "mail_message_mailbox" ("id")
WHERE "raw_source" IS NULL AND "raw_source_checked_at" IS NULL;

UPDATE "mail_message_mailbox" AS "message_copy"
SET "uid_validity" = "sync_state"."uid_validity"
FROM "mailbox_sync" AS "sync_state"
WHERE "message_copy"."mailbox" = "sync_state"."mailbox";
