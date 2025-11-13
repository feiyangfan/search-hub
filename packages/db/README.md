# Database (Prisma + Postgres) — Learning Notes


## Big Ideas 
- **Single source of truth**: Prisma schema defines the data model.
- **Ownership & reuse**: one DB package (`@search-hub/db`) exports the Prisma client (singleton) + helpers.
- **Strong edges, flexible internals**: validate at API boundaries (Zod), enforce invariants in DB (FKs, enums).
- **Gradual realism**: start with naive “title contains” search; later swap to full-text/vector without changing contracts.
- **Multi-tenancy first**: every record is scoped by `tenantId` to prevent data leaks.

---

## Architecture Decisions (and why)

1) **Dedicated DB package**
   - *Why*: centralize schema, migrations, client; avoid duplication.
   - *Tradeoff*: one more package to build/watch, but clearer ownership.

2) **Prisma ORM**
   - *Why*: type-safe queries, migrations, stable tooling.
   - *Tradeoff*: generated client requires strict version alignment (CLI ↔ client).

3) **Singleton PrismaClient**
   - *Why*: avoids “too many connections” during dev hot-reload.
   - *How*: store instance on `globalThis` in dev.
   - **Global Prisma singleton** (prevents connection storms):
        ```ts
        const g = globalThis as any;
        export const prisma = g.prisma ?? new PrismaClient();
        if (process.env.NODE_ENV === "development") g.prisma = prisma;
        ```

1) **Enforce invariants in DB**
   - *Why*: FKs, enums, indexes protect invariants beyond app code.

---

## Model Design

- **Tenant**: hard multi-tenant boundary; FKs ensure all data belongs to a tenant.
- **User**: placeholder for future auth/roles.
- **Document**: uploaded/added content to index & search.
- **IndexJob**: async pipeline unit (queue → process → status).

**Schema rules baked in**
- `Document.tenantId -> Tenant.id` (FK + cascade): ensures every doc has a real tenant.
- `IndexJob.status` enum (`queued|processing|indexed|failed`): prevents invalid states.
- Indexes on `tenantId`, `status`, `title`: match typical queries.

> **Mental model**: model the **nouns**, their **relationships**, and their **lifecycle**. Add only what the next 1–2 milestones need.

---

## Prisma Workflow (muscle memory)

1. Edit `packages/db/prisma/schema.prisma`.
2. **Generate**: `pnpm --filter @search-hub/db prisma generate`.
3. **Migrate**: `pnpm --filter @search-hub/db prisma migrate dev --name <change>`.
4. **Manual migrations** (pgvector indexes): Prisma doesn't support `USING ivfflat` syntax.
   - After running migrations, apply: `psql $DATABASE_URL -f packages/db/prisma/manual-migrations/01_pgvector_indexes.sql`
   - Or use: `./packages/db/scripts/apply-manual-migrations.sh`
   - **Important**: If Prisma generates a migration that drops `DocumentChunk_embedding_cosine_idx`, manually remove the DROP statement from the migration file.
5. **Use** the client via `@search-hub/db` (don't set `generator.output`).

---

## Querystrings & Coercion (why search failed)

- Express delivers query params as **strings** (e.g., `"10"`).
- Use `z.coerce.number()` for `limit`/`offset` to coerce then validate.
- Keep coercion in schemas (avoid scattered `Number()` in handlers).

---

## DB Helpers (thin repository layer)

- Start tiny helpers in `@search-hub/db` (`db.document.create`, `db.job.enqueueIndex`).
- Benefits: consistent patterns, easy future refactors, isolate Prisma from handlers.

