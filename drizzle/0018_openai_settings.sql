ALTER TABLE "mail_config"
ADD COLUMN "openai_api_key" text;

ALTER TABLE "mail_config"
ADD COLUMN "openai_model" text;

ALTER TABLE "mail_config"
ADD COLUMN "openai_importance_classification" boolean;
