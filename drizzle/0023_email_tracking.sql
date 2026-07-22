ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "tracking_token" text;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "opened_at" timestamp with time zone;
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "smtp_job_tracking_token_idx" ON "smtp_job" USING btree ("tracking_token");
