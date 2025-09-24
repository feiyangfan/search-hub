# Queue + Worker (BullMQ + Redis) — Learning Notes 📝

> Project: **Search Hub** · Focus: make **indexing async** so the API stays fast, reliable, and scalable.

---

## Rules of thumb
- If it’s user-facing but heavy → queue it.

- Truth belongs in a database.

- Design for retries (make steps idempotent; throw on failure).

- Name queues with constants; validate payloads at both ends.

- One place to log completion; noisy logs hide real issues.

## 0) What I actually built (in my own words)

- When I `POST /v1/documents`, the API:
  1. Creates a **Document** row in Postgres (this is the real business record).
  2. Writes an **IndexJob** row with `status = queued` (truth + audit trail).
  3. **Enqueues** a BullMQ job to Redis with `{ tenantId, documentId }` and retries/backoff.
  4. Returns **202 Accepted** immediately.

- A separate **Worker** process subscribes to the same queue name and:
  1. Moves DB state: `queued → processing`.
  2. Does the work (today a simulated sleep; tomorrow: extract → embed → upsert).
  3. Moves DB state: `processing → indexed` (or `failed` with an error message).
  4. Lets BullMQ handle retries/backoff automatically if my code throws.

---

## 1) Why async? (what clicked for me)

- **Latency:** indexing is not user-facing; don’t hold the request open.
- **Reliability:** background jobs can retry safely and survive crashes.
- **Scale:** workers are cheap to scale horizontally; the API doesn’t care.

**Mental model I’ll remember:**
- Postgres = **source of truth** (what should/has happened)
- Redis = **delivery rail** (move work around + retry engine)
- Worker = **execution unit** (my code, not a magic Redis thing)

---

## 2) “Aha!” moments

- The **worker is not created by Redis**. It’s created by *my Node process* when `new Worker(...)` runs.
- **Order matters**: *Document → IndexJob → enqueue*. If enqueue fails, I still have a durable `queued` row to reconcile later.
- **At-least-once delivery** is the norm. Design idempotent transitions (filtered `updateMany`) and make the processing step safe to retry.
- Use a **constant queue name** (e.g., `JOBS.INDEX_DOCUMENT`) so API + Worker never drift.

---

## 3) Small design decisions I’m proud of

- **Filtered state transitions** (idempotent):
  - `updateMany where status='queued'` → `processing`
  - `updateMany where status='processing'` → `indexed|failed`
- **Compound index** for worker speed: `@@index([tenantId, documentId, status])`.
- Optional **de-dup**: `@@unique([tenantId, documentId, status])` (treat unique violation as “already queued”).
- **Retries with exponential backoff** in BullMQ (`attempts: 3`, `1s, 2s, 4s`).
- **RemoveOnComplete** in Redis; keep truth in Postgres.

---

## 4) How the pieces map (tiny ASCII diagram)
```
Client
│
│ POST /v1/documents (202)
▼
API (apps/api)
├─ Postgres: Document (insert)
├─ Postgres: IndexJob { queued }
└─ Redis: add job to queue "index:document"
│
▼
Worker (apps/worker)
├─ Postgres: queued → processing
├─ Do work (extract/embed/upsert…)
└─ Postgres: processing → indexed | failed
```

---

## 5) Trade-offs 

- DB row before enqueue (chosen): durable intent, easy recovery.
↔ Enqueue first: risk of “ghost jobs” if crash before DB write.

- Keep truth in DB (chosen): operational insight + reconciliation.
↔ Redis-only: faster, but no status/history → hard to debug/communicate.

- Unique constraint (optional): prevents duplicate active jobs, but requires handling unique violations (or using upsert).

- QueueEvents vs worker events: one source of “completed/failed” logs is enough; two = noisy.

## 6) Pitfalls I hit (and how I fixed them)

- Hot reload started the worker twice
Symptom: multiple “Worker started” lines.
Fix: narrow watch paths (tsx --ignore ...), ensure Turbo isn’t launching it twice, and use global guards for QueueEvents.

- Double completion logs
Symptom: “completed” printed twice.
Fix: log from either QueueEvents or worker.on('completed'), not both.

- Worker logs labeled as “api”
Fix: logger.child({ service: 'worker' }) so streams are distinguishable.

- Job stuck in queued (Redis glitch)
Fix: DB still shows queued; I can re-enqueue from a small script that scans IndexJob where status='queued'.
