# API Service

> Search Hub’s Express API handles authentication, document ingestion, semantic search, and background job orchestration. The goal: **explicit contracts, thin handlers, and defensive middleware around every dependency**.

---

## 1. Getting Started

```bash
pnpm install
pnpm --filter api dev        # runs tsx watch on src/index.ts

# other useful scripts
pnpm --filter api build      # tsup → dist/
pnpm --filter api start      # runs built server
pnpm --filter api test       # vitest + coverage
pnpm --filter api lint
pnpm --filter api openapi:generate
```

### Prerequisites
- Node.js 22+
- pnpm 10+
- PostgreSQL 15+ (the repo ships a Prisma schema)
- Redis 7+ (sessions + rate limiter + queue metadata)

The quickest way to boot dependencies is `docker compose up` from `infra/docker-compose.yml`.

---

## 2. Runtime Configuration

Configuration is loaded via `@search-hub/config-env` (`packages/config/env`). On startup the service parses `.env` with Zod and exits if anything critical is missing.

| Variable | Purpose | Notes |
| --- | --- | --- |
| `PORT` | HTTP port. | Defaults to 3000. |
| `BASE_URL` | External URL (used for redirects/cookies). | Required for prod. |
| `DATABASE_URL` | Postgres connection string. | Prisma uses this. |
| `REDIS_URL` | Redis connection string. | Sessions + rate limiter. |
| `SESSION_SECRET` | 32+ char secret for signing cookies. | Required. |
| `API_RATE_LIMIT_MAX`, `API_RATE_LIMIT_WINDOW_MS` | Token bucket limits. | Entire `/v1/*` tree is protected. |
| `API_BREAKER_*` | Circuit breaker thresholds for Voyage AI calls. | Prevents cascading failures. |
| `VOYAGE_API_KEY` | Upstream embedding/rerank key. | Needed for semantic search. |

Sample snippet for local development:

```ini
DATABASE_URL=postgres://postgres:postgres@localhost:5432/search_hub
REDIS_URL=redis://localhost:6379
SESSION_SECRET=dev-secret-change-me-please-1234567890
API_RATE_LIMIT_MAX=60
API_RATE_LIMIT_WINDOW_MS=60000
API_BREAKER_FAILURE_THRESHOLD=3
API_BREAKER_RESET_TIMEOUT_MS=30000
API_BREAKER_HALF_OPEN_TIMEOUT_MS=2000
VOYAGE_API_KEY=sk-xxxx
```

---

## 3. Directory Map

```
src/
├─ app.ts                        # creates express app, wires middleware
├─ index.ts                      # boots server + session store
├─ config/env.ts                 # wraps loadApiEnv()
├─ queue.ts                      # BullMQ queue instances
├─ lib/
│  └─ circuitBreaker.ts          # circuit breaker for AI calls
├─ middleware/
│  ├─ authMiddleware.ts          # session guard for /v1/*
│  ├─ correlationMiddleware.ts   # AsyncLocalStorage for tracing
│  ├─ errorHandlerMiddleware.ts  # centralized error handling
│  ├─ rateLimitMiddleware.ts     # Redis token bucket rate limiter
│  ├─ requestLoggerMiddleware.ts # Pino HTTP logging
│  └─ validateMiddleware.ts      # Zod validation middleware
├─ routes/
│  ├─ auth/                      # sign-in/out/up + OAuth endpoints
│  │  ├─ index.ts
│  │  ├─ sign-in.ts
│  │  ├─ sign-up.ts
│  │  ├─ sign-out.ts
│  │  └─ oauth/                  # OAuth provider routes
│  ├─ documents.ts               # CRUD operations for documents
│  ├─ search.ts                  # lexical, semantic, hybrid search
│  ├─ tags.ts                    # tag management endpoints
│  ├─ reminders.ts               # reminder endpoints
│  ├─ tenants.ts                 # tenant/workspace management
│  ├─ users.ts                   # user profile endpoints
│  ├─ health.ts                  # health check endpoint
│  ├─ metrics.ts                 # Prometheus metrics endpoint
│  └─ routes.ts                  # mounts all v1 routes + auth
├─ services/
│  ├─ searchService.ts           # hybrid search with RRF fusion
│  ├─ documentService.ts         # document operations + job queueing
│  └─ tagService.ts              # tag operations
├─ session/
│  └─ store.ts                   # Redis session store configuration
└─ types/
   └─ express/                   # express-session augmentations
      └─ index.d.ts
```

**Design principles**
- **Contracts first:** All inputs/outputs originate from `@search-hub/schemas`. `validateBody` / `validateQuery` parse raw requests before business logic runs.
- **Stateless handlers:** Routes collect validated data, call the db/services layer, and format responses. Work is delegated to repositories in `@search-hub/db` or service helpers.
- **Defensive middleware:** Rate limiting, circuit breaker, and structured error handling wrap every external call so upstream turbulence degrades gracefully.

### Key API Endpoints

#### Public Routes
- `GET /health` - Health check (database + uptime)
- `GET /metrics` - Prometheus metrics
- `GET /docs` - Swagger UI documentation
- `POST /v1/auth/sign-in` - Email/password authentication
- `POST /v1/auth/sign-up` - User registration
- `POST /v1/auth/sign-out` - Session destruction
- `GET /v1/auth/oauth/:provider` - OAuth flow initiation

#### Protected Routes (require authentication)
- `GET /v1/documents` - List documents with pagination
- `POST /v1/documents` - Create document (returns 202, queues indexing)
- `GET /v1/documents/:id` - Get document by ID
- `PATCH /v1/documents/:id` - Update document
- `DELETE /v1/documents/:id` - Delete document
- `PATCH /v1/documents/:id/icon` - Update document icon
- `GET /v1/lexical-search` - Full-text search
- `GET /v1/semantic-search` - Vector similarity search
- `GET /v1/hybrid-search` - Combined lexical + semantic (RRF)
- `GET /v1/tags` - List workspace tags
- `POST /v1/tags` - Create tag
- `PATCH /v1/tags/:id` - Update tag
- `DELETE /v1/tags/:id` - Delete tag
- `GET /v1/tenants` - List user's tenants
- `POST /v1/tenants` - Create new tenant
- `GET /v1/users/me` - Get current user profile

---

## 4. Auth Flow Reference

1. `POST /v1/auth/sign-up` validates `AuthPayload`, hashes the password with bcrypt (10 salt rounds), and creates the user in Postgres through `@search-hub/db` (`db.user.create` defends against duplicates with a 409).
2. `POST /v1/auth/sign-in` validates credentials, compares the bcrypt hash, regenerates the Express session, and stores `session.userId` + `session.email`. Sessions are persisted in Redis via `connect-redis`.
3. `POST /v1/auth/sign-out` destroys the server session and clears the `connect.sid` cookie (secure + httpOnly + sameSite=lax in production).
4. Any `/v1/*` route beyond auth mounts `authRequired`; if `session.userId` is absent it returns `401 Unauthorized`.
5. The Next.js app talks to these endpoints through `@search-hub/sdk` from its API routes so credentials stay server-side.

This pairing keeps NextAuth (JWT session) and Express (cookie session) in sync: the Next proxy forwards `credentials: 'include'` requests so the browser carries `connect.sid`.

---

## 5. Background Jobs & Rate Limiting Cheat Sheet

- **Document ingestion**: `POST /v1/documents` returns `202 Accepted` after creating a `Document` + `IndexJob` row and queuing work. Workers (see `apps/worker`) update job status via filtered `updateMany` transitions to stay idempotent.
- **Rate limiter**: `createRateLimiter()` wraps all `/v1/*` calls. If Redis is down the middleware throws an internal error; monitor logs (`rate_limit_error`) during boot.
- **Circuit breaker**: Voyage helpers emit `VOYAGE_UNAVAILABLE` after `API_BREAKER_FAILURE_THRESHOLD` consecutive failures; metrics/logs include the breaker state for dashboards.

Manual smoke tests:

```bash
# 400 – validation failure
curl -i "http://localhost:3000/v1/search?tenantId=&q="

# 202 – queue document for indexing
curl -s -X POST "http://localhost:3000/v1/documents" \
  -H "content-type: application/json" \
  -b "connect.sid=..." \
  -d '{"tenantId":"t1","title":"My Doc","source":"upload"}'
```

---

## 6. Testing Notes

- Unit/integration tests live in `src/__tests__`. Vitest uses Supertest against the Express app (`createServer()`).
- Mocked modules: `@search-hub/db`, the queue, and Voyage helpers so tests stay fast and deterministic.
- When adding new routes, prefer **contract-first tests**: import the relevant Zod schema to ensure the handler responds with the documented structure.

Run once with coverage: `pnpm --filter api test`.

---

## 7. Deployment Checklist

- Confirm migrations ran (`pnpm prisma migrate deploy` from `packages/db`).
- Ensure `SESSION_SECRET` and `DATABASE_URL` are set out-of-band (never commit).
- Provision Redis with durable storage; sessions + rate-limiter share the instance.
- Configure your reverse proxy / load balancer to trust the first proxy (`app.set('trust proxy', 1)`) so secure cookies work behind TLS terminators.

With these pieces in place the API balances correctness (Zod + Prisma), resilience (rate limiter + circuit breaker), and operability (structured logging + predictable HTTP semantics).

---

## 8. Learning Notes

### SOP: how I shipped auth without losing my mind
1. **Start from the contract.** Update `@search-hub/schemas` (`AuthPayload`, `UserProfile`) first so the API, SDK, and Next app compile against the same shapes. Regenerate OpenAPI/SDK *before* touching handlers.
2. **Prisma next.** Add/adjust the model in `packages/db/prisma/schema.prisma`, run `pnpm --filter @search-hub/db prisma migrate dev`, and expose repository helpers in `packages/db/src/index.ts`. I always wrap uniqueness errors there instead of in the route.
3. **Middleware + routes.** Create the handler in `apps/api/src/routes/auth/*`, mount it via `buildRoutes()`, and double-check `authRequired` still covers downstream routes. Any new session fields go straight into `apps/api/src/types/express/index.d.ts`.
4. **Session plumbing.** Revisit `session(store).ts` whenever cookie attributes change. The combo that finally worked everywhere: `sameSite: 'lax'`, `httpOnly: true`, `secure: env.NODE_ENV === 'production'`, and `trust proxy = 1`.
5. **Frontend handshake.** Expose the new endpoint through `SearchHubClient`, then call it from a Next API route. Client components never talk to the Express API directly—keeps cookies and secrets in the server.
6. **Smoke it.** `curl` `/v1/auth/sign-up`, `/v1/auth/sign-in`, `/v1/auth/sign-out` while watching the `connect.sid` cookie. Then run through the same flow in the browser to ensure NextAuth (JWT) and Express (cookie) sessions stay in sync.

### What tripped me up (and how I dug out)
- **TypeScript screamed about `req.session.userId`.** Answer: augment `express-session` in `apps/api/src/types/express/index.d.ts`. Without this, every handler became a type assertion party.
- **NextAuth kept “signing in” but nothing stuck.** I originally let NextAuth use the default fetcher. Fix was forcing `credentials: 'include'` in `SearchHubClient` whenever Next is the caller so the browser sends `connect.sid`.
- **Duplicate sign-ups exploded into 500s.** Prisma’s `P2002` needs handling close to the DB. I now throw `USER_ALREADY_EXISTS` with a `409` from `db.user.create`, which the Next proxy maps back onto the email field.
- **Sign-out was flaky.** Clearing the cookie without matching the original attributes fails silently. Now `res.clearCookie('connect.sid', { sameSite: 'lax', secure: env.NODE_ENV === 'production', httpOnly: true })` mirrors the creation settings.
- **Rate limiter blocked my own tests.** Forgetting to start Redis meant every request died with `rate_limit_error`. Lesson: sessions + rate limiting share Redis—boot Docker compose before touching `/v1/*`.

### Edge-case checklist
- After successful sign-in I must `req.session.regenerate` before attaching `userId` to avoid fixation.
- Always `req.session.save` prior to responding; Redis latency otherwise swallows the last mutation.
- Never hash passwords synchronously; the async `bcrypt.hash(password, SALT_ROUNDS)` keeps the event loop healthy.
- Remember to include new session properties in the type augmentation and, if needed, in `SearchHubClient` responses (e.g., when the UI needs extra profile fields).
- When adding providers (Google, etc.), lock down redirect URLs and refresh the NextAuth secret—cookies + JWT expiries behave differently in production.

### Little wins I want to repeat
- Shared Zod schemas mean I get compile-time nudges across API, SDK, and Next the moment a shape changes.
- Keeping route handlers “thin” lets vitest focus on service logic; mocks stay small and expressive.
- Centralising auth checks in middleware stopped me from shipping unprotected routes more than once.
- The SDK error helper (`ensureOk`) saved countless debugging cycles by surfacing the actual upstream response body.

### Recent hardening takeaways
- Tenant-scoped routes must confirm the session user belongs to the tenant before touching Prisma—validate membership up front, not after the write.
- Unique constraints (`@@unique`/`@unique`) are only half the story; always catch Prisma `P2002` in the repository layer and translate it to a 409 so handlers stay clean.
- When `req.session.regenerate` fails, return immediately. Otherwise the handler continues on a broken session and can double-send responses.
- Keep responses aligned with the shared Zod contract. If the handler shape changes, update the schema (and OpenAPI) at the same time so SDKs stay in lockstep.

These notes capture the real bumps and fixes from building the auth stack. Next time I forget why something is wired the way it is, this is the breadcrumb trail.
