# ADR-0001 – API Framework: Express + TypeScript over Fastify/NestJS

**Status:** Accepted

## Context
We need a backend HTTP framework that lets us ship an ops-ready API (logging, tracing, rate limiting) in ~1 month.

## Decision
Use **Express + TypeScript** for the API service.

## Options Considered
- **Express (chosen):** Ubiquitous, tons of middleware/examples, minimal surface area, easy to wire pino/zod/OTel/BullMQ.
- Fastify: Faster router and nice plugins, but smaller ecosystem familiarity; perf gains won’t matter vs DB/network.
- NestJS: Powerful DI/modules, but heavier concepts/decorators slow us down in a 1-month build.

## Consequences
+ Low cognitive load, fast to integrate observability/reliability.
+ Readable to most reviewers/interviewers.
− Slightly more manual structure (e.g., CORS/auth boilerplate) vs NestJS conventions.
