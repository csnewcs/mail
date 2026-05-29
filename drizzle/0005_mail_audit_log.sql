CREATE TABLE IF NOT EXISTS "mail_audit_log" (
  "id" serial PRIMARY KEY NOT NULL,
  "action" text NOT NULL,
  "entity_type" text NOT NULL,
  "entity_id" text,
  "summary" text NOT NULL,
  "metadata" text DEFAULT '{}' NOT NULL,
  "actor_user_id" text,
  "actor_email" text,
  "ip_address" text,
  "user_agent" text,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_audit_log_created_at_idx" ON "mail_audit_log" ("created_at");
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "mail_audit_log_entity_idx" ON "mail_audit_log" ("entity_type", "entity_id");
