ALTER TABLE "mail_filter" ADD COLUMN "conditions" jsonb;

UPDATE "mail_filter"
SET "conditions" = jsonb_build_object(
  'version', 1,
  'match', 'all',
  'conditions', jsonb_build_array(
    jsonb_build_object('field', "field", 'operator', "operator", 'value', "value")
  )
)
WHERE "conditions" IS NULL;
