ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "read_notification_sent_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "read_notification_attempt_count" integer DEFAULT 0 NOT NULL;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "read_notification_available_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "read_notification_claimed_at" timestamp with time zone;
--> statement-breakpoint
UPDATE "smtp_job" SET "read_notification_sent_at" = "opened_at" WHERE "opened_at" IS NOT NULL AND "read_notification_sent_at" IS NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "smtp_job_read_notification_pending_idx" ON "smtp_job" USING btree ("read_notification_sent_at", "read_notification_available_at");
