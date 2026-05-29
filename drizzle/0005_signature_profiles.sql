CREATE TABLE "mail_signature" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "html" text DEFAULT '' NOT NULL,
  "is_default" boolean DEFAULT false NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);

INSERT INTO "mail_signature" ("name", "html", "is_default")
SELECT 'Default', "signature", true
FROM "mail_config"
WHERE COALESCE("signature", '') <> ''
  AND NOT EXISTS (SELECT 1 FROM "mail_signature");
