ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "message_id" text;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "sent_mailbox" text;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "placeholder_active" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "smtp_job_message_id_idx" ON "smtp_job" USING btree ("message_id");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "smtp_job_placeholder_mailbox_status_created_at_idx" ON "smtp_job" USING btree ("placeholder_active", "sent_mailbox", "status", "created_at");
