# ADR-0012 – Services Hosting: Render over Railway/Fly/EC2

**Status:** Accepted

## Context
We need to run an API and a worker with Docker images on a mostly-free plan, minimal ops.

## Decision
Host **API** and **Worker** on **Render** (Free).

## Options Considered
- **Render (chosen):** Simple Docker services + background workers, free tier, SSL/logs/rollbacks included.
- Railway: Great DX with credits, but may incur costs after the trial; free tier policies shift.
- Fly.io: Powerful and global but more ops-y; we don’t need multi-region for v1.
- EC2: Full control, higher ops/time than we can afford.

## Consequences
+ Quick deployments with minimal config; background worker support is straightforward.
− Cold starts/quotas; fine for a portfolio app.
