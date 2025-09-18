# ADR-0006 – API Style: JSON REST over GraphQL

**Status:** Accepted (Supersedes prior ADR-0006)

## Context
We need a simple, fast-to-ship API surface that supports clear authZ (org/role), straightforward caching, and easy observability. Timeline is ~1 month.

## Decision
Expose a **JSON REST** API for v1 (no GraphQL).

## Options Considered
- **JSON REST (chosen):** Simple routes map directly to resources and authZ checks; easy to log/trace per route; trivial to cache; minimal schema machinery.
- GraphQL: Flexible client queries but adds server schema, resolvers, N+1 pitfalls, caching complexity, and extra tooling/learning overhead for the timeline.

## Consequences
+ Faster delivery, simpler error handling, easier traces/logs/metrics per endpoint.
+ Clear mapping of org-scoped authorization and rate limits by route.
− Less client-driven flexibility vs GraphQL (acceptable for v1; can revisit later).
