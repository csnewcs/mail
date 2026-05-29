CREATE TABLE "mail_sender_rule" (
	"id" serial PRIMARY KEY NOT NULL,
	"type" text NOT NULL,
	"sender" text NOT NULL,
	"normalized_sender" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_sender_rule_type_normalized_sender_idx" ON "mail_sender_rule" USING btree ("type","normalized_sender");--> statement-breakpoint
CREATE INDEX "mail_sender_rule_normalized_sender_idx" ON "mail_sender_rule" USING btree ("normalized_sender");
