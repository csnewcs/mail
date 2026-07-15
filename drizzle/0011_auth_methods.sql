ALTER TABLE "mail_config" ADD COLUMN "auth_setup_complete" boolean DEFAULT false NOT NULL;
ALTER TABLE "mail_config" ADD COLUMN "auth_user_id" text;
ALTER TABLE "mail_config" ADD COLUMN "github_client_id" text;
ALTER TABLE "mail_config" ADD COLUMN "github_client_secret" text;
ALTER TABLE "mail_config" ADD COLUMN "discord_client_id" text;
ALTER TABLE "mail_config" ADD COLUMN "discord_client_secret" text;
ALTER TABLE "mail_config" ADD COLUMN "oidc_issuer" text;
ALTER TABLE "mail_config" ADD COLUMN "oidc_authorization_url" text;
ALTER TABLE "mail_config" ADD COLUMN "oidc_token_url" text;
ALTER TABLE "mail_config" ADD COLUMN "oidc_user_info_url" text;

CREATE TABLE "passkey" (
	"id" text PRIMARY KEY NOT NULL,
	"name" text,
	"public_key" text NOT NULL,
	"user_id" text NOT NULL,
	"credential_id" text NOT NULL,
	"counter" integer NOT NULL,
	"device_type" text NOT NULL,
	"backed_up" boolean NOT NULL,
	"transports" text,
	"created_at" timestamp with time zone DEFAULT now(),
	"aaguid" text
);

ALTER TABLE "passkey" ADD CONSTRAINT "passkey_user_id_user_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."user"("id") ON DELETE cascade ON UPDATE no action;
CREATE INDEX "passkey_userId_idx" ON "passkey" USING btree ("user_id");
CREATE INDEX "passkey_credentialID_idx" ON "passkey" USING btree ("credential_id");

UPDATE "mail_config" AS config
SET "auth_user_id" = (
	SELECT "account"."user_id"
	FROM "account"
	WHERE "account"."provider_id" = 'oidc'
		AND "account"."account_id" = config."oidc_subject"
	LIMIT 1
)
WHERE config."id" = 1 AND config."auth_user_id" IS NULL;

UPDATE "mail_config"
SET "auth_setup_complete" = true
WHERE "auth_user_id" IS NOT NULL
	OR ("oidc_discovery_url" IS NOT NULL AND "oidc_client_id" IS NOT NULL AND "oidc_client_secret" IS NOT NULL);
