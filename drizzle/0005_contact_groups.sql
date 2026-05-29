CREATE TABLE "mail_contact_group" (
	"id" serial PRIMARY KEY NOT NULL,
	"name" text NOT NULL,
	"description" text DEFAULT '' NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "mail_contact_group_member" (
	"id" serial PRIMARY KEY NOT NULL,
	"group_id" integer NOT NULL,
	"contact_id" integer NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX "mail_contact_group_name_idx" ON "mail_contact_group" USING btree ("name");--> statement-breakpoint
CREATE UNIQUE INDEX "mail_contact_group_member_group_contact_idx" ON "mail_contact_group_member" USING btree ("group_id","contact_id");--> statement-breakpoint
CREATE INDEX "mail_contact_group_member_group_id_idx" ON "mail_contact_group_member" USING btree ("group_id");--> statement-breakpoint
CREATE INDEX "mail_contact_group_member_contact_id_idx" ON "mail_contact_group_member" USING btree ("contact_id");
