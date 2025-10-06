# Search Hub

Search Hub is a multi-tenant knowledge platform that blends full-text and semantic retrieval with production-grade observability.

## Table of Contents
- [Search Hub](#search-hub)
  - [Table of Contents](#table-of-contents)
  - [Highlights](#highlights)
  - [Core Capabilities](#core-capabilities)
    - [Capture \& Organize](#capture--organize)
    - [Search \& Retrieval](#search--retrieval)
    - [Reliability \& Observability](#reliability--observability)
  - [Architecture \& Stack](#architecture--stack)
    - [Runtime \& Tooling](#runtime--tooling)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Background Workers](#background-workers)
    - [Data \& Search](#data--search)
    - [AI Integrations](#ai-integrations)
    - [File Storage \& CDN](#file-storage--cdn)
    - [Observability](#observability)
    - [Reliability \& Security](#reliability--security)
    - [CI/CD \& Deployment](#cicd--deployment)
  - [Architecture Decision Records](#architecture-decision-records)
  - [Why These Choices Work Together](#why-these-choices-work-together)

## Highlights
- Hybrid retrieval via Reciprocal Rank Fusion (RRF) keeps both lexical and semantic results relevant.
- Direct-to-S3 uploads, CloudFront caching, and content-hash keys make file handling fast and safe.
- Background workers, rate limiting, and circuit breakers keep `/search` responsive even when AI providers wobble.
- Unified observability stack (traces, logs, metrics) powers Grafana dashboards and alerting.

## Core Capabilities
### Capture & Organize
- Markdown note authoring with tagging.
- Attachments for PDFs and images stored on S3 with immutable content hashes.

### Search & Retrieval
- PostgreSQL full-text search for precise keyword matches.
- pgvector-backed embeddings for semantic recall.
- RRF fusion of lexical and vector rankings, with tag and date filters.

### Reliability & Observability
- Token-bucket rate limiting on critical routes (`/ai/*`, `/search`).
- Idempotent background jobs with exponential backoff + jitter to prevent retry storms.
- OpenTelemetry spans from UI → API → DB/Redis/OpenAI, structured logging with Pino, and Prometheus metrics surfaced in Grafana dashboards and alerts.

## Architecture & Stack
### Runtime & Tooling
- **Node.js** 22 LTS with **TypeScript**
- **pnpm** workspaces (>= 10)

### Frontend
- **Next.js** + **React** + **TypeScript**
- **Tailwind CSS** and **shadcn/ui** for styling

### Backend
- **Express** (TypeScript)
- **Zod** for input validation
- **Pino** for structured logging

### Background Workers
- Redis + BullMQ (Upstash) for queues, retries, priorities, and metrics
- Idempotency via content hashes; exponential backoff with jitter and a circuit breaker for external calls
- Queue depth, throughput, and failure metrics exported for dashboards

### Data & Search
- PostgreSQL 17 (Neon) with Prisma ORM
- pgvector for embeddings and similarity search
- PostgreSQL FTS (`tsvector`) for lexical search
- Hybrid retrieval measured with nDCG/MRR to stay within latency budgets

### AI Integrations
- Voyage for embeddings and rerank
- gloq for concise summaries

### File Storage & CDN
- S3 presigned PUT uploads for browser clients (direct-to-S3)
- CloudFront for edge caching and private-bucket access via OAC

### Observability
- Traces: OpenTelemetry → Grafana Cloud Tempo
- Logs: Pino JSON logs enriched with `traceId/orgId/userId` → Grafana Cloud Loki
- Metrics: `prom-client` → Grafana Cloud Prometheus; dashboards cover route latency (p50/p95/p99), error rates, DB performance, queue health, AI outcomes; two alerts watch API p99 latency and worker failure rate

### Reliability & Security
- Graceful shutdown for API and workers
- Organization-scoped authentication across routes and queries

### CI/CD & Deployment
- GitHub Actions for type checks, linting, tests, build, Docker, and deploy
- Vercel (frontend), Render/Railway/Fly (backend)
- Neon (PostgreSQL), Upstash (Redis), Grafana Cloud (Tempo/Loki/Prometheus)
- AWS S3 + CloudFront for asset storage and delivery

## Architecture Decision Records
Architectural choices are documented in ADRs. See the index at [docs/adr/README.md](docs/adr/README.md).

## Why These Choices Work Together
- **Performance & relevancy:** Combining Postgres FTS with pgvector embeddings delivers balanced recall and precision without introducing a separate vector database.
- **Operational clarity:** Shared tracing IDs across logs, metrics, and traces give quick insight into tenant-level behaviour.
- **Resilience:** Circuit breakers, backoff, and rate limits contain third-party failures and maintain predictable latency.
