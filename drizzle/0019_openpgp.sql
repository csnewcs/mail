CREATE TABLE IF NOT EXISTS "openpgp_key" (
	"id" serial PRIMARY KEY NOT NULL,
	"fingerprint" text NOT NULL,
	"name" text DEFAULT '' NOT NULL,
	"email" text DEFAULT '' NOT NULL,
	"public_key" text NOT NULL,
	"private_key" text,
	"passphrase" text,
	"is_own" boolean DEFAULT false NOT NULL,
	"is_default" boolean DEFAULT false NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX IF NOT EXISTS "openpgp_key_fingerprint_idx" ON "openpgp_key" USING btree ("fingerprint");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "openpgp_key_email_idx" ON "openpgp_key" USING btree ("email");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "openpgp_key_own_default_idx" ON "openpgp_key" USING btree ("is_own", "is_default");
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_signed" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_signature_status" text;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_signer" text;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_fingerprint" text;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_encrypted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_decrypted" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_error" text;
--> statement-breakpoint
ALTER TABLE "mail_message_mailbox" ADD COLUMN IF NOT EXISTS "openpgp_processed_at" timestamp with time zone;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_message_mailbox_openpgp_processed_at_idx" ON "mail_message_mailbox" USING btree ("openpgp_processed_at");
--> statement-breakpoint
ALTER TABLE "mail_draft" ADD COLUMN IF NOT EXISTS "smtp_server_id" text;
--> statement-breakpoint
ALTER TABLE "mail_draft" ADD COLUMN IF NOT EXISTS "from_name" text;
--> statement-breakpoint
ALTER TABLE "mail_draft" ADD COLUMN IF NOT EXISTS "openpgp_signing" text DEFAULT 'none' NOT NULL;
--> statement-breakpoint
ALTER TABLE "mail_draft" ADD COLUMN IF NOT EXISTS "openpgp_encrypt" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "mail_draft" ADD COLUMN IF NOT EXISTS "attach_public_key" boolean DEFAULT false NOT NULL;
