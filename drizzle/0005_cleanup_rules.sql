CREATE TABLE "mail_cleanup_rule" (
  "id" serial PRIMARY KEY NOT NULL,
  "enabled" boolean DEFAULT true NOT NULL,
  "mailbox" text,
  "min_age_days" integer NOT NULL,
  "action" text DEFAULT 'archive' NOT NULL,
  "last_run_at" timestamp with time zone,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
