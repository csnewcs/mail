ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "delivered_at" timestamp with time zone;
--> statement-breakpoint
ALTER TABLE "smtp_job" ADD COLUMN IF NOT EXISTS "raw_message" bytea;
