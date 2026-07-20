ALTER TABLE "mail_message"
ADD COLUMN "ai_important" boolean DEFAULT false NOT NULL;

ALTER TABLE "mail_message"
ADD COLUMN "ai_importance_classified_at" timestamp with time zone;

ALTER TABLE "mail_message"
ADD COLUMN "ai_importance_attempts" integer DEFAULT 0 NOT NULL;

ALTER TABLE "mail_message"
ADD COLUMN "ai_importance_claimed_at" timestamp with time zone;

UPDATE "mail_message"
SET "ai_importance_classified_at" = now();

CREATE INDEX "mail_message_ai_importance_pending_idx"
ON "mail_message" ("id")
WHERE "ai_importance_classified_at" IS NULL;
