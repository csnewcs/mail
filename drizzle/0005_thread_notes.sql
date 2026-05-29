CREATE TABLE "mail_thread_note" (
	"thread_key" text PRIMARY KEY NOT NULL,
	"body" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX "mail_thread_note_updated_at_idx" ON "mail_thread_note" USING btree ("updated_at");
