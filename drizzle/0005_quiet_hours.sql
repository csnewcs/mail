ALTER TABLE "mail_config" ADD COLUMN "quiet_hours_enabled" boolean;
ALTER TABLE "mail_config" ADD COLUMN "quiet_hours_start" text;
ALTER TABLE "mail_config" ADD COLUMN "quiet_hours_end" text;
ALTER TABLE "mail_config" ADD COLUMN "quiet_hours_timezone" text;
