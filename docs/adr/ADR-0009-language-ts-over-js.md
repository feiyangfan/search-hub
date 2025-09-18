# ADR-0009 – Language: TypeScript over JavaScript

**Status:** Accepted

## Context
We want correctness, editor support, and refactor safety across API, worker, and UI.

## Decision
Use **TypeScript** everywhere.

## Options Considered
- **TypeScript (chosen):** Static types, inference, better IDE support, safer refactors; strong hiring signal.
- JavaScript: Lighter setup but weaker guarantees; higher runtime error risk.

## Consequences
+ Fewer production bugs; clearer contracts (types shared across services).
− Build tooling slightly heavier; worth it for a full-stack project.
