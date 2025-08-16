# ADR-0001: Runtime & Language – Node.js 20 + TypeScript

**Status:** Accepted
**Date:** 2025-08-08

## Context

Need fast backend iteration, rich ecosystem, and strong typing without heavy ceremony.

## Decision

Use **Node.js 20 LTS** with **TypeScript (strict)**.

## Consequences

- ✅ High dev velocity, huge library ecosystem.
- ✅ Type safety for maintainability and interviews.
- ❌ Not as fast as Go on CPU-bound tasks (mitigated by offloading heavy work to workers).

## Alternatives Considered

Go, Python — rejected due to slower personal velocity and weaker fit for the chosen stack.

---

# ADR-0002: HTTP Framework – Express now, Fastify later

**Status:** Accepted
**Date:** 2025-08-08

## Context

MVP needs minimal friction. Later we want better performance and plugins.

## Decision

Start with **Express 5**, keep controllers framework-agnostic, plan to **migrate to Fastify** post-MVP.

## Consequences

- ✅ Faster to wire now.
- ✅ Easy migration if handlers are isolated.
- ❌ Migration cost later.

## Alternatives Considered

Start with Fastify now — viable but more setup.

---

# ADR-0003: Database – PostgreSQL + Kysely + Kysely Migrator

**Status:** Accepted
**Date:** 2025-08-08

## Context

Relational storage with FTS and explicit SQL control is needed.

## Decision

Use **PostgreSQL 16** + **Kysely** (type-safe SQL) + **Kysely Migrator**.

## Consequences

- ✅ Full SQL transparency/control.
- ✅ Postgres extensions (FTS, pgvector).
- ❌ More boilerplate vs ORM.

## Alternatives Considered

Prisma/Drizzle — faster scaffolding but less control.

---

# ADR-0004: Search – Postgres FTS + pgvector (Hybrid)

**Status:** Accepted
**Date:** 2025-08-08

## Context

We want both keyword and semantic search without extra infra.

## Decision

Hybrid search combining **FTS (tsvector + GIN)** and **pgvector (IVFFlat)**.

## Consequences

- ✅ Single datastore ops.
- ❌ OLTP + vector in one DB may hit limits at scale.

## Alternatives Considered

External vector DB (Qdrant/Milvus) — defer until scaling.

---

# ADR-0005: Caching/Queues/Events – Redis + BullMQ + Outbox

**Status:** Accepted
**Date:** 2025-08-08

## Context

Async work must not block requests; events must be reliable.

## Decision

**Redis 7** + **BullMQ** queues. Outbox table for reliability.

## Consequences

- ✅ Fast responses.
- ✅ Reliable side-effects.
- ❌ Need queue monitoring.

## Alternatives Considered

Raw Redis Streams later; Kafka/NATS overkill for MVP.

---

# ADR-0006: Embeddings – Self-hosted (xenova MiniLM-L6-v2)

**Status:** Accepted
**Date:** 2025-08-08

## Context

Need semantic vectors without API cost or data exposure.

## Decision

Use **@xenova/transformers** with **all-MiniLM-L6-v2** (384-dim).

## Consequences

- ✅ Zero API cost.
- ❌ CPU latency on save.

## Alternatives Considered

Hosted embeddings — rejected due to lock-in and cost.

---

# ADR-0007: Auth & Security – Cookie sessions, argon2, CSRF, rate limits

**Status:** Accepted
**Date:** 2025-08-08

## Context

Standard web security for a single-user MVP.

## Decision

**iron-session** cookies, **argon2id** hashing, **helmet**, CORS, CSRF, Redis rate limits.

## Consequences

- ✅ Boring, correct, widely used.
- ❌ CSRF complexity.

## Alternatives Considered

JWT, OAuth — later if multi-tenant.

---

# ADR-0008: Observability – pino, OpenTelemetry, prom-client

**Status:** Accepted
**Date:** 2025-08-08

## Context

Credible observability from day one.

## Decision

**pino** for logs, **OpenTelemetry** for tracing, **prom-client** for metrics.

## Consequences

- ✅ Three pillars covered.
- ❌ Cardinality risks.

## Alternatives Considered

Console logs only — toy.

---

# ADR-0009: Validation & Config – Zod + env validation

**Status:** Accepted
**Date:** 2025-08-08

## Context

Prevent bad inputs and misconfigurations.

## Decision

Use **Zod** for DTOs and envalid/Zod for env vars.

## Consequences

- ✅ Fail-fast.
- ❌ Slight boilerplate.

## Alternatives Considered

AJV, TypeBox — possible but Zod is simpler.

---

# ADR-0010: Testing & CI – Vitest, Supertest, k6, Husky, GitHub Actions

**Status:** Accepted
**Date:** 2025-08-08

## Context

Local guardrails and non-bypassable CI.

## Decision

**Vitest**, **Supertest**, **k6**, ESLint/Prettier, Husky, lint-staged, GitHub Actions.

## Consequences

- ✅ Measurable p95.
- ❌ CI runtime cost.

## Alternatives Considered

Jest — fine alternative.

---

# ADR-0011: Build/Deploy – Docker Compose, workers, platform TLS; add NGINX later

**Status:** Accepted
**Date:** 2025-08-08

## Context

One-command dev and low-ops deploy.

## Decision

**Docker Compose** with Postgres, Redis, API, workers; deploy on Fly/Render/Railway. Add NGINX later.

## Consequences

- ✅ Minimal ops.
- ❌ Free-tier cold starts.

## Alternatives Considered

Kubernetes — overkill for MVP.
