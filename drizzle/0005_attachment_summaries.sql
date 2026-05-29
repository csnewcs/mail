CREATE TABLE "mail_attachment_summary" (
	"id" serial PRIMARY KEY NOT NULL,
	"attachment_id" integer NOT NULL,
	"content_fingerprint" text NOT NULL,
	"summary" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "mail_attachment_summary_attachment_id_unique" UNIQUE("attachment_id")
);
