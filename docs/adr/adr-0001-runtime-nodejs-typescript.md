# ADR-0001: Runtime & Language – Node.js 20 + TypeScript

**Status:** Accepted
**Date:** 2025-08-08

## Context

Need fast backend iteration, rich ecosystem, and strong typing without heavy ceremony.

## Decision

Use **Node.js 22 LTS** with **TypeScript (strict)**.

## Consequences

- ✅ High dev velocity, huge library ecosystem.
- ✅ Type safety for maintainability and interviews.
- ❌ Not as fast as Go on CPU-bound tasks (mitigated by offloading heavy work to workers).

## Alternatives Considered

Go, Python — rejected due to slower personal velocity and weaker fit for the chosen stack.
