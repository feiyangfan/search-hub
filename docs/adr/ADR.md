# ADR-0001: Runtime & Language – Node.js + TypeScript

**Status:** Accepted **Date:** 2025-08-18

## Context

We need a stable, type-safe runtime with strong ecosystem support.

## Decision

Use **Node.js 22 LTS** with **TypeScript (strict)**.

## Consequences

-   ✅ Long-term support, stable ABI.
-   ✅ Strong typing improves maintainability.
-   ❌ Slower than Go/Rust for CPU-bound tasks.

---

# ADR-0002: Package Manager – pnpm

**Status:** Accepted **Date:** 2025-08-18

## Context

Efficient dependency management is critical for reproducible builds and CI.

## Decision

Use **pnpm (workspaces)**.

## Consequences

-   ✅ Faster installs, disk efficiency, shared package store.
-   ✅ Strong monorepo support.
-   ❌ Less common in older projects vs npm/yarn.

---

# ADR-0003: Architecture – Hexagonal (Ports & Adapters)

**Status:** Accepted **Date:** 2025-08-18

## Context

We want domain logic decoupled from frameworks and infra.

## Decision

Adopt **Hexagonal architecture**.

## Consequences

-   ✅ Business logic independent of Express/Postgres/Redis.
-   ✅ Easier testing and replacement of adapters.
-   ❌ More boilerplate vs direct coupling.

---

# ADR-0004: HTTP Framework – Express (Fastify later)

**Status:** Accepted **Date:** 2025-08-18

## Context

MVP requires fast iteration with a large ecosystem.

## Decision

Start with **Express 5**, plan migration to **Fastify**.

## Consequences

-   ✅ Fast setup.
-   ✅ Broad middleware support.
-   ❌ Migration work later.

---

# ADR-0005: Validation & Config – Zod

**Status:** Accepted **Date:** 2025-08-18

## Context

We need safe request validation and environment configuration.

## Decision

Use **Zod** for DTOs and `safeParse` for environment validation.

## Consequences

-   ✅ Fail-fast on bad inputs/config.
-   ❌ Slight boilerplate cost.

---

# ADR-0006: Database – PostgreSQL + Kysely

**Status:** Accepted **Date:** 2025-08-18

## Context

Relational DB with strong SQL support and extensions is needed.

## Decision

Use **PostgreSQL 16 (Docker)** + **Kysely** query builder with Kysely Migrator.

## Consequences

-   ✅ Full SQL control, type safety.
-   ✅ Supports FTS and pgvector.
-   ❌ Slightly more verbose than Prisma/Drizzle.

---

# ADR-0007: Cache & Sessions – Redis

**Status:** Accepted **Date:** 2025-08-18

## Context

Need fast caching, stateless APIs, and rate limiting.

## Decision

Use **Redis 7** for caching, session store, and rate limiting.

## Consequences

-   ✅ Simple server-side sessions via opaque IDs.
-   ✅ Reliable rate-limiting with TTL.
-   ❌ Extra infra to maintain.

---

# ADR-0008: Authentication – Cookie Sessions

**Status:** Accepted **Date:** 2025-08-18

## Context

MVP needs simple, secure auth.

## Decision

Use **iron-session** cookies with Redis-backed session state.

## Consequences

-   ✅ Simpler than JWT.
-   ✅ Cookies secure by default with flags.
-   ❌ Not multi-tenant ready.

---

# ADR-0009: Observability – Logs, Metrics, Traces

**Status:** Accepted **Date:** 2025-08-18

## Context

Credible observability from day one.

## Decision

-   **Logs:** Pino → Promtail → Loki → Grafana.
-   **Metrics:** prom-client → Prometheus → Grafana.
-   **Traces:** OpenTelemetry → Tempo → Grafana.

## Consequences

-   ✅ Covers three pillars: logs, metrics, traces.
-   ✅ Single Grafana UI for all signals.
-   ❌ Requires running multiple services.

---

# ADR-0010: Security – Best Practices

**Status:** Accepted **Date:** 2025-08-18

## Context

We need secure defaults against common attacks.

## Decision

-   **Helmet** for HTTP headers.
-   **Body size limits**.
-   **Strict CORS allowlist**.
-   **Redis-backed rate limiting**.
-   **Cookie flags:** HttpOnly, Secure, SameSite=Lax.
-   **Zod env validation**.

## Consequences

-   ✅ Hardened MVP.
-   ❌ Slight friction in local dev.

---

# ADR-0011: Testing & CI/CD

**Status:** Accepted **Date:** 2025-08-18

## Context

Need guardrails and reproducible builds.

## Decision

-   **Vitest** for unit tests.
-   **Supertest** for e2e.
-   **GitHub Actions** for lint, typecheck, unit + e2e, gated deploy.

## Consequences

-   ✅ Reliable, non-bypassable quality gates.
-   ❌ Slightly longer CI runs.

---

# ADR-0012: Containers & DevOps

**Status:** Accepted **Date:** 2025-08-18

## Context

We want reproducible environments.

## Decision

-   **Docker Compose** for dev: api, postgres, redis, prometheus, grafana, loki,
    promtail, tempo.
-   Separate Dockerfiles for client and server.

## Consequences

-   ✅ One-command setup.
-   ✅ Easy teardown/reset.
-   ❌ Higher resource usage in dev.
