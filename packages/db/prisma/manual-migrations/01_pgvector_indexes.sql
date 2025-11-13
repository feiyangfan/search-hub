-- Manual pgvector indexes (not managed by Prisma)
-- Run this after migrations if the index doesn't exist

-- Check if the index exists before creating
DO $$ 
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_indexes 
        WHERE indexname = 'DocumentChunk_embedding_cosine_idx'
    ) THEN
        CREATE INDEX "DocumentChunk_embedding_cosine_idx" 
        ON "public"."DocumentChunk" 
        USING ivfflat ("embedding" vector_cosine_ops) 
        WITH (lists = 100);
    END IF;
END $$;
