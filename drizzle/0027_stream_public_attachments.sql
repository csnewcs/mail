ALTER TABLE "public_attachment" ALTER COLUMN "content" DROP NOT NULL;
ALTER TABLE "public_attachment" ADD COLUMN "committed_at" timestamp with time zone;
UPDATE "public_attachment" SET "committed_at" = "created_at" WHERE "content" IS NOT NULL;
