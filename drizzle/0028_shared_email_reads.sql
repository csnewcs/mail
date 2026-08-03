ALTER TABLE "mail_share" ADD COLUMN IF NOT EXISTS "read_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_share_message_id_idx" ON "mail_share" USING btree ("message_id");
