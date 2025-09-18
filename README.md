# Nexus Trace

A full‑stack app with a Node.js + TypeScript backend (`server`) and
a frontend (`client`). 

> Goal: clean, scalable, and interview‑ready architecture with sensible
> defaults.

## Project Tech stack
### Runtime/Language
- Node.js 22 LTS + TS
- pnpm >= 10
### Frontend
- React + Next.js
- Tailwind for styling
- shadcn/ui for UI kit
### Backend
- Express + TS
- Zod for validaiton
### Worker and Jobs
- Redis with BullMQ
### Database
- Postgres 16 with Prisma
### Storage
- S3 with presigned PUT
- CloudFront
### Observability
- OpenTelemetry traces
- Logs: pino + loki
- Metrics: prom-client + grafana
- Traces: OTLP + Tempo
- Dashboards with 2 alerts (API p99, worker failures)
### CI/CD & Deployment
- GitHub Actions: typecheck, lint, test, build, docker, deploy
- Vercel for frontend
- TO BE DECIDED for backend
- Neon for postgres
- Upstash for redis
- Grafana Cloud
- AWS S3