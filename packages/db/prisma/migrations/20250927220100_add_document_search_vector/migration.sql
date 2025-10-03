ALTER TABLE "public"."Document"
  ADD COLUMN "searchVector" tsvector NOT NULL DEFAULT ''::tsvector;

UPDATE "public"."Document"
SET "searchVector" =
    setweight(to_tsvector('english', COALESCE("title", '')), 'A') ||
    setweight(to_tsvector('english', COALESCE("content", '')), 'B');

CREATE INDEX "Document_searchVector_idx"
  ON "public"."Document"
  USING GIN ("searchVector");
