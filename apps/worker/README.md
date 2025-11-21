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
  2. Performs the work:
     - Fetches document content from database
     - Checks idempotency via SHA-256 checksum
     - Chunks text into 1000-char segments with 100-char overlap
     - Generates 1024-dimensional embeddings via Voyage AI (voyage-3.5-lite)
     - Stores chunks with embeddings in `DocumentChunk` table
     - Updates `DocumentIndexState` with checksum for future idempotency
  3. Moves DB state: `processing → indexed` (or `failed` with error message).
  4. Lets BullMQ handle retries/backoff automatically if the code throws.
  5. Emits Prometheus metrics for observability (duration, success/failure, active jobs).

### Job Types

1. **INDEX_DOCUMENT** - Document content indexing pipeline
2. **SEND_REMINDER** - Reminder notification delivery (future)

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
↔ Enqueue first: risk of "ghost jobs" if crash before DB write.

- Keep truth in DB (chosen): operational insight + reconciliation.
↔ Redis-only: faster, but no status/history → hard to debug/communicate.

- Unique constraint (optional): prevents duplicate active jobs, but requires handling unique violations (or using upsert).

- QueueEvents vs worker events: one source of "completed/failed" logs is enough; two = noisy.

---

## 7) Configuration & Environment

The worker requires several environment variables (validated via `@search-hub/config-env`):

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_URL` | url | *required* | Redis connection for queue |
| `DATABASE_URL` | url | *required* | PostgreSQL connection |
| `VOYAGE_API_KEY` | string | *required* | Voyage AI API key |
| `WORKER_CONCURRENCY` | number | 5 | Concurrent jobs |
| `WORKER_MAX_CHUNK_LIMIT` | number | 5000 | Max chunks per document |

Example `.env`:
```ini
REDIS_URL=redis://localhost:6379
DATABASE_URL=postgresql://searchhub:searchhub@localhost:5432/searchhub
VOYAGE_API_KEY=sk-xxx
WORKER_CONCURRENCY=5
WORKER_MAX_CHUNK_LIMIT=5000
```

---

## 8) Observability & Monitoring

### Metrics Exported

The worker emits Prometheus metrics for monitoring:

- `jobs_processed_total{job_type, result}` - Total jobs processed
- `jobs_failed_total{job_type, error_code}` - Failed jobs by error type
- `job_duration_seconds{job_type, tenant_id, result}` - Processing duration histogram
- `active_jobs{job_type, tenant_id}` - Currently processing jobs gauge
- `queue_depth{queue_name, tenant_id}` - Pending jobs in queue
- `ai_request_duration_seconds{provider, operation}` - AI API latency

### Logging

Structured logs via Pino include:
- Job lifecycle events (started, completed, failed)
- Processing steps (chunking, embedding, storage)
- Error details with context
- Performance metrics (chunk count, vector count, duration)

### Health Checks

Monitor worker health via:
- Process uptime
- Redis connectivity
- Database connectivity
- Queue depth trends
- Job failure rates

---

## 9) Performance Characteristics

### Throughput

- **Concurrency**: Configurable via `WORKER_CONCURRENCY` (default: 5)
- **Chunk processing**: ~100-200 chunks/second
- **Embedding generation**: Limited by Voyage AI rate limits
- **Database writes**: Batched for efficiency

### Latency

Typical processing times (per document):
- Empty content: <100ms
- Small document (<1000 chars): 1-2s
- Medium document (1000-10000 chars): 2-5s  
- Large document (>10000 chars): 5-30s

Factors affecting latency:
- Document size (chunking overhead)
- Voyage AI API response time (300-800ms per request)
- Database write performance
- Network latency

### Resource Usage

- **Memory**: ~50-200MB per worker process
- **CPU**: Low (I/O bound, mostly waiting for AI API)
- **Network**: Moderate (embedding API calls)
- **Database connections**: 1 connection per worker

---

## 10) Error Handling & Recovery

### Idempotency

Documents are checksummed (SHA-256) to prevent redundant reindexing:
- Checksum stored in `DocumentIndexState` table
- If content unchanged, skip processing
- Enables safe retries without duplicate work

### Retry Strategy

BullMQ configuration:
- **Attempts**: 3 retries
- **Backoff**: Exponential (1s, 2s, 4s)
- **Jitter**: Prevents retry storms

### Failure Scenarios

| Scenario | Handling |
|----------|----------|
| Document not found | Mark job as failed, log error |
| Empty content | Mark as indexed (no-op) |
| Chunk limit exceeded | Fail with descriptive error |
| Voyage AI timeout | Retry with backoff |
| Database error | Retry with backoff |
| Invalid content | Mark as failed, log error |

### Recovery Tools

Reconcile stuck jobs:
```sql
-- Find queued jobs older than 1 hour
SELECT * FROM "IndexJob"
WHERE status = 'queued' AND "createdAt" < NOW() - INTERVAL '1 hour';

-- Manually retry a job
UPDATE "IndexJob" SET status = 'queued', "updatedAt" = NOW()
WHERE id = 'job_id' AND status IN ('processing', 'failed');
```

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
