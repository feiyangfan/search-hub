-- Trigger to automatically update searchVector on Document insert/update
-- This combines title and content into a full-text search vector

-- Create or replace the trigger function
CREATE OR REPLACE FUNCTION update_document_search_vector()
RETURNS TRIGGER AS $$
BEGIN
    NEW."searchVector" := 
        setweight(to_tsvector('english', COALESCE(NEW.title, '')), 'A') ||
        setweight(to_tsvector('english', COALESCE(NEW.content, '')), 'B');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Drop the trigger if it exists
DROP TRIGGER IF EXISTS document_search_vector_update ON "Document";

-- Create the trigger
CREATE TRIGGER document_search_vector_update
    BEFORE INSERT OR UPDATE OF title, content
    ON "Document"
    FOR EACH ROW
    EXECUTE FUNCTION update_document_search_vector();

-- Update existing documents with searchVector
UPDATE "Document"
SET "searchVector" = 
    setweight(to_tsvector('english', COALESCE(title, '')), 'A') ||
    setweight(to_tsvector('english', COALESCE(content, '')), 'B')
WHERE "searchVector" IS NULL OR "searchVector" = ''::tsvector;
