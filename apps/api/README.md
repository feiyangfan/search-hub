# API Service

This package hosts the HTTP API for Search Hub. The service emphasises explicit contracts, thin handlers, and defensive middleware around every external dependency.

## Design Principles

- **Define contracts first.** Build Zod schemas for inputs and outputs so routes document the payloads they expect and return.
- **Validate at the boundary.** The first code that sees raw data (`validateBody`, `validateQuery`) must verify it before passing control downstream.
- **Keep handlers thin.** Routes orchestrate work in a few lines; business logic migrates into services/repositories as the project grows.

## Conventions & Notes

1. **HTTP semantics**
   - Async workflows respond with `202 Accepted` (e.g., document indexing).
   - Synchronous creations use `201 Created` and should include a `Location` header.
   - Validation failures return `400 Bad Request` with the standard error envelope.
2. **Versioned routes** live under `/v1`, leaving room for future revisions.
3. **List responses** always wrap data in an object (never a bare array) to make pagination predictable for clients.

## Manual Smoke Tests

```bash
# Bad request (missing tenant & query)
curl -i "http://localhost:3000/v1/search?tenantId=&q="

# Happy-path search
curl -s "http://localhost:3000/v1/search?tenantId=t1&q=hello" | jq .

# Queue a document for indexing
curl -s -X POST "http://localhost:3000/v1/documents" \
  -H "content-type: application/json" \
  -d '{"tenantId":"t1","title":"My Doc","source":"upload"}'
```

## Traffic Protection

### Redis-backed Rate Limiting

All `/v1/*` routes flow through a Redis token-bucket limiter. The middleware sits **before** the versioned router, so every request must pass the quota check. Run the infra stack (`infra/docker-compose.yml`) or point `REDIS_URL` to an existing instance.

| Variable | Description | Suggested dev value |
| --- | --- | --- |
| `API_RATE_LIMIT_MAX` | Tokens available per caller per window. | `60` |
| `API_RATE_LIMIT_WINDOW_MS` | Window length in milliseconds. | `60000` (1 minute) |
| `REDIS_URL` | Redis connection string. | `redis://localhost:6379` |

Example `.env` fragment:

```ini
REDIS_URL=redis://localhost:6379
API_RATE_LIMIT_MAX=60
API_RATE_LIMIT_WINDOW_MS=60000
```

### Voyage Circuit Breaker

Semantic search depends on Voyage embeddings/rerank. A circuit breaker shields the endpoint so sustained upstream failures return a controlled `503 VOYAGE_UNAVAILABLE` instead of cascading errors.

| Variable | Description | Suggested dev value |
| --- | --- | --- |
| `API_BREAKER_FAILURE_THRESHOLD` | Consecutive failures before opening. | `3` |
| `API_BREAKER_RESET_TIMEOUT_MS` | Minimum time the breaker stays open (ms). | `30000` |
| `API_BREAKER_HALF_OPEN_TIMEOUT_MS` | Extra delay before the half-open probe (ms). | `2000` |
| `VOYAGE_API_KEY` | Voyage API credential. | *(set locally)* |

Put these alongside the rate-limit settings in `apps/api/.env`.

#### Manual Breaker Test

1. Export the breaker env vars and start the API.
2. Temporarily set an invalid `VOYAGE_API_KEY`.
3. Call `GET /v1/semantic-search` until the threshold is hit—you should receive:
   ```json
   {
     "error": {
       "code": "VOYAGE_UNAVAILABLE",
       "message": "Semantic search is temporarily unavailable. Please retry shortly."
     }
   }
   ```
4. Restore a valid key, wait `API_BREAKER_RESET_TIMEOUT_MS`, and retry to confirm recovery.
