#!/bin/bash
# Helper script to apply manual migrations after Prisma migrations

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
MANUAL_MIGRATIONS_DIR="$SCRIPT_DIR/../prisma/manual-migrations"
DB_DIR="$SCRIPT_DIR/.."

# Load DATABASE_URL from .env file
if [ -f "$DB_DIR/.env" ]; then
    export $(grep -v '^#' "$DB_DIR/.env" | xargs)
fi

if [ -z "$DATABASE_URL" ]; then
    echo "❌ ERROR: DATABASE_URL not found in .env file"
    exit 1
fi

# Strip query parameters from DATABASE_URL for psql compatibility
# Prisma uses ?schema=public but psql doesn't support query params
PSQL_URL="${DATABASE_URL%%\?*}"

echo "Applying manual migrations..."

# Apply pgvector indexes
echo "- Applying pgvector indexes..."
psql "$PSQL_URL" -f "$MANUAL_MIGRATIONS_DIR/01_pgvector_indexes.sql"

echo "✅ Manual migrations applied successfully"
