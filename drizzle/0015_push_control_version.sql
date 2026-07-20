ALTER TABLE "mail_push_subscription"
ADD COLUMN "read_control_version" integer DEFAULT 0 NOT NULL;
