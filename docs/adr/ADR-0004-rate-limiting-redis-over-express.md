# ADR-0004 – Rate Limiting: Redis/Lua Token-Bucket over express-rate-limit/in-memory

**Status:** Accepted

## Context
We must protect `/ai/*` and `/search` across multiple instances and control burst/sustained rates.

## Decision
Implement a **token-bucket** in **Redis** with a small **Lua** script for atomic check/decrement.

## Options Considered
- **Redis/Lua (chosen):** Distributed, accurate, atomic; tunable caps.
- express-rate-limit/in-memory: Not correct across instances; easy to bypass under load.

## Consequences
+ Prevents 429s/cost spikes; predictable behavior under load.
− Small Lua snippet to maintain; test carefully.
