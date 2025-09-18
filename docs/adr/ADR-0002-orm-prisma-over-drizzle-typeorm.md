# ADR-0002 – ORM: Prisma over Drizzle/TypeORM

**Status:** Accepted

## Context
We need type-safe DB access, straightforward migrations, and strong docs while still using raw SQL for FTS/pgvector.

## Decision
Use **Prisma** ORM with Postgres.

## Options Considered
- **Prisma (chosen):** Excellent DX, robust generators/migrations, huge community, plays well with raw SQL.
- Drizzle: Lightweight & modern; good option but Prisma’s ecosystem/velocity helps us ship faster.
- TypeORM: Heavier abstraction and historically spikier DX.

## Consequences
+ Fast schema iteration and type safety.
+ Easy onboarding for reviewers.
− Slightly larger client; not edge-friendly (fine for our API).
