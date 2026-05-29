CREATE TABLE "mail_thread_metadata" (
	"id" serial PRIMARY KEY NOT NULL,
	"mailbox" text NOT NULL,
	"thread_key" text NOT NULL,
	"starred" boolean DEFAULT false NOT NULL,
	"pinned" boolean DEFAULT false NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_thread_metadata_mailbox_thread_key_idx" ON "mail_thread_metadata" USING btree ("mailbox","thread_key");--> statement-breakpoint
CREATE INDEX "mail_thread_metadata_mailbox_starred_idx" ON "mail_thread_metadata" USING btree ("mailbox","starred");--> statement-breakpoint
CREATE INDEX "mail_thread_metadata_mailbox_pinned_idx" ON "mail_thread_metadata" USING btree ("mailbox","pinned");
