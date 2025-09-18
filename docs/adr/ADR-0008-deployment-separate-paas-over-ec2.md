# ADR-0008 – Deployment: Separate PaaS (Vercel + Render) over EC2

**Status:** Accepted

## Context
We must ship production in ~1 month with minimal ops and (ideally) free/credit tiers.

## Decision
Deploy **web** on **Vercel**, and **API/Worker** as Docker services on **Render** (free-leaning). Avoid managing VMs.

## Options Considered
- **Vercel + Render (chosen):** Fast setup, built-in SSL, health checks, rollbacks, logs; minimal infra work.
- EC2 (DIY): Full control but higher ops tax (OS hardening, TLS, reverse proxy, deploy scripts, log shipping).
- ECS/App Runner: Managed containers, but more AWS setup than we need for v1.

## Consequences
+ Focus time on features (search/O11y) rather than servers.
− Free tiers may cold-start; acceptable for a portfolio app.
