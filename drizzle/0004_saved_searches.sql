CREATE TABLE "saved_search" (
  "id" serial PRIMARY KEY NOT NULL,
  "name" text NOT NULL,
  "query" text NOT NULL,
  "created_at" timestamp with time zone DEFAULT now() NOT NULL,
  "updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
