# Nexus Trace

A full‑stack app with a Node.js + TypeScript backend (`server`) and
a frontend (`client`). 

> Goal: clean, scalable, and interview‑ready architecture with sensible
> defaults.

## Project Tech stack
### Runtime/Language
- **Node.js** 22 LTS + TS
- **pnpm** (workspace) >= 10
### Frontend
- **React** + **Next.js** + **TS**
- **Tailwind CSS** for styling and shadcn/ui for UI kit
### Backend
- **Express + TS**
- **Zod** for validaiton
- **Pino** for structured logging
- 
### Worker & Jobs
- Redis with BullMQ (deployed with upstash)
- Idempotency via content hash; retries with exponential backoff + jitter
- Metrics: queue depth, processed/sec, failures
### Database & Search
- Postgres 17 (deployed with Neon) with Prisma
- pgvector for embeddings
- Postgres FTS (tsvector) for lexical search
- Hybrid retrieval: FTS + vector via Reciprocal rank fusion
### AI
- OpenAI for embeddings + short summaries
- Ollama as local fallback and dev
### File Storage & CDN
- S3 with presigned PUT uploads (direct-to-s3)
- CloudFront for cached, fast downloads
- content-hash keys for immutable caching
### Observability
- OpenTelemetry traces (UI - API - DB/Redis/OpenAI) -> Grafana Cloud Tempo 
- Logs: pino + loki
- Metrics: prom-client + Grafana Cloud Prometheus 
- Dashboards with 2 alerts (API p99, worker failures rate)
- Dashboards with route latency (p50/p95/p99), error rate, DB latency, queue metric, AI call outcomes
### Reliability & Security
- token-bucket rate limiter using Redis on important routes. e.g. /ai/* and /search
- Graceful shutdown
- Org-scoped auth on all routes and queries
### CI/CD & Deployment
- GitHub Actions: typecheck, lint, test, build, docker, deploy
- Vercel for frontend
- Render or Railway/Fly for backend
- Neon for postgres
- Upstash for redis
- Grafana Cloud for Tempo/loki/prom
- AWS S3 + CloudFront