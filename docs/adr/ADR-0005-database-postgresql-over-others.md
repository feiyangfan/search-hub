# ADR-0005 – Database: PostgreSQL over NoSQL/MongoDB/Vector DBs

**Status:** Accepted

## Context
We need one primary datastore that supports multi-tenant relational modeling, transactions, full-text search, and vector similarity for hybrid retrieval—within a 1-month timeline and mostly free tiers.

## Decision
Use **PostgreSQL 16** as the primary database.

## Options Considered
- **PostgreSQL (chosen):** Mature RDBMS with **Full-Text Search (`tsvector`)**, **`pgvector`** for embeddings, strong indexing/constraints, JSONB for semi-structured data, and rich SQL.
- MongoDB / NoSQL: Flexible schema, but weaker relational integrity and more work to achieve our hybrid search needs (joins/transactions + FTS + vectors) in one place.
- Managed Vector DBs (Pinecone/Weaviate/etc.): Excellent at large-scale vector search, but adds cost/vendor lock-in and we’d still need a relational DB for core entities.
- MySQL/MariaDB: Solid RDBMS, but FTS and vector support are less standard for our use case.
- SQLite: Great locally; lacks concurrency and server features needed for multi-tenant SaaS.

## Consequences
+ One engine covers **CRUD + FTS + vectors**, minimizing moving parts and ops.
+ Strong hiring signal: modern Postgres features (FTS/pgvector), SQL tuning, migrations.
− We must maintain and tune both FTS and ANN indexes within Postgres.
