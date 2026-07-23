CREATE TABLE "composed_mailbox" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"slug" text NOT NULL,
	"mailbox_paths" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "composed_mailbox_name_idx" ON "composed_mailbox" USING btree ("name");
--> statement-breakpoint
CREATE UNIQUE INDEX "composed_mailbox_slug_idx" ON "composed_mailbox" USING btree ("slug");
