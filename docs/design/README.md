# Project Structure – Learning Notes 


> These notes explain **why** this monorepo is shaped the way it is, what each **app** and **package** is responsible for, how they **fit together**, and how these choices helped the final product ship faster and safer.

---

## 1) Big picture: why a pnpm monorepo?

* **One repo, many deployables**: UI (Next.js), API (Express), Worker (BullMQ). Each is an *app* you can deploy independently.
* **Shared code via packages**: things like Prisma, Zod schemas, logging, and the SDK live in `packages/*` so every app stays consistent.
* **Fast dev**: Turborepo runs tasks in parallel and caches builds. One command (`pnpm dev`) spins up everything.
* **Refactor‑proof contracts**: Zod schemas define the API once; types flow everywhere.

> Mental model: `apps/*` are **runners** (processes you deploy). `packages/*` are **libraries** (reused building blocks).

---

## 2) Apps (deployables)

### `apps/web` — Next.js (App Router) UI

* **Role**: The user‑facing web app.
* **Why separate**: UI has its own build/runtime (Next), different concerns than API/Worker.
* **Key idea**: The browser never calls the API directly. It calls **proxy routes** under `app/api/*` (server‑side Next handlers). Those use the SDK to talk to the API. This avoids CORS, hides secrets, and centralizes auth.
* **Impact**: Frontend stays simple. Changing API URLs, headers, or auth only happens in one place (proxy), not across many components.

### `apps/api` — Express/TypeScript API

* **Role**: The HTTP contract of the system (`/v1/*`). Validates inputs, talks to the DB, enqueues jobs, and returns safe DTOs.
* **Why separate**: The API needs different middleware (helmet, cors, pino), and its own scaling. It shouldn’t contain UI logic.
* **Key idea**: **Contracts first**. Requests/responses are defined in Zod (in `packages/schemas`), and the API uses those to validate real traffic.
* **Impact**: Safer changes. If a field becomes required, the API gate keeps it, and the SDK/types catch consumer code during compile.

### `apps/worker` — BullMQ Worker (background jobs)

* **Role**: Executes slow/async work (indexing, parsing, embeddings) off the request path.
* **Why separate**: Workers scale independently and can crash/retry without affecting live requests.
* **Key idea**: API **accepts** work quickly (returns `202`) and records a job in the DB; Worker **executes** and updates job status (`queued → processing → indexed|failed`).
* **Impact**: Responsive API, reliable processing, and clear operational visibility via job states.

> Optional apps like `apps/ingest` or `apps/eval` fit the same pattern: small, focused deployables.

---

## 3) Packages (shared libraries)

### `packages/db` — Prisma schema + client

* **Role**: Owns the **database schema** (Prisma) and exports a safe **singleton** client for Node.
* **Why needed**: A single source of truth for tables/relations avoids drift between apps.
* **How it helps**: Type‑safe DB queries everywhere; migrations are easy; API/Worker share the same model layer.

### `packages/schemas` — Zod contracts (+ OpenAPI builder)

* **Role**: Defines request/response shapes (e.g., `SearchQuery`, `CreateDocumentRequest`) and common errors.
* **Why needed**: One definition to validate server inputs and to generate OpenAPI → TypeScript types.
* **How it helps**: Strong typing across boundaries; fewer runtime surprises; docs and SDK derive from the same source.

### `packages/sdk` — Tiny typed API client

* **Role**: A small `SearchHubClient` that wraps `fetch` with exact types from OpenAPI.
* **Why needed**: Avoid scattered manual fetch calls and keep consumers in sync when contracts change.
* **How it helps**: The web **proxy routes** and workers (if they talk HTTP) use the SDK; when schemas change, TypeScript guides updates.

### `packages/logger` — pino logger

* **Role**: Centralized logging config (levels, redaction, pretty‑print in dev).
* **Why needed**: Consistent logs across apps make debugging and observability easier.
* **How it helps**: Every app logs the same way; attach request IDs later without changing each app.

### `packages/config/env` — Typed env loader

* **Role**: Parse environment variables with Zod (`loadServerEnv()`), fail fast when something is missing.
* **Why needed**: Avoid “undefined env” bugs at runtime.
* **How it helps**: Each app has a clear, typed config surface; `.env.example` documents everything.

### `packages/ui` — Shared UI primitives (optional)

* **Role**: Central place for reusable components/wrappers over shadcn/ui.
* **Why needed**: Keeps look‑and‑feel consistent; avoids copy‑pasting UI bits.
* **How it helps**: Faster UI work as the app grows. (You can keep this minimal early on.)

### `packages/observability` — OTel bootstrap (optional)

* **Role**: One function to start tracing/metrics with sane defaults.
* **Why needed**: Makes adding tracing/log correlation trivial across apps.
* **How it helps**: Production issues get root‑caused faster (trace → log → DB row).

### `packages/queue` — Queue names & helpers (optional)

* **Role**: Constants for BullMQ queue names and shared job codecs.
* **Why needed**: Avoid typos and version mismatches in queue names/payloads.
* **How it helps**: API and Worker share job shapes from a single place.

### `packages/utils` — Small, pure utilities (optional)

* **Role**: Reusable, framework‑agnostic helpers.
* **Why needed**: Keeps “glue” logic out of apps; easy to test.
* **How it helps**: Reduces duplication and clarifies ownership.

---

## 4) Infra & Ops

### `infra/docker-compose.*.yml`

* **Role**: Local dependencies (Postgres, Redis, S3/MinIO, observability stack).
* **Why needed**: Reproducible dev environment with one command.
* **How it helps**: Onboard new devs quickly; fewer “works on my machine” issues.

### CI (`.github/workflows`)

* **Role**: Typecheck, lint, build, test on every PR.
* **Why needed**: Catch drift and broken contracts early.
* **How it helps**: Green pipelines = safe to merge; broken builds fail fast.

### Turborepo & TS base config

* **Role**: Orchestrate tasks and share strict TS settings across apps/packages.
* **Why needed**: Consistency + speed.
* **How it helps**: One command runs everything; caches speed up local and CI builds.

---

## 5) How these choices helped the final product

* **Speed**: Adding features rarely touches more than one place. Contracts → regenerate → update call sites.
* **Safety**: Zod validates inputs at the edge; Prisma types DB queries; SDK types requests/responses.
* **Scalability**: API and Worker scale independently; heavy work is offloaded reliably.
* **Operability**: Shared logging/telemetry made debugging predictable across services.
* **Onboarding**: New contributors can skim `packages/*` to see the building blocks, then check `apps/*` for how they’re used.

---

## 6) Common pitfalls (and how the structure avoids them)

* **CORS & leaked secrets** → Browser hits **Next proxy**, not the API; secrets stay server‑side.
* **Contract drift** → Zod + OpenAPI + SDK types keep clients honest.
* **DB coupling to UI** → Only API/Worker import `packages/db`; the UI never touches the DB.
* **Inconsistent logging** → Single logger package; same format everywhere.
* **Env confusion** → Typed env loader; `.env.example` documents everything.

---

## 7) If I were to redo it tomorrow

* Keep the separation exactly the same.
* Start with only the essential packages (`db`, `schemas`, `sdk`, `logger`, `config/env`). Add others when there’s a clear reuse.
* Wire observability earlier—it pays off the first time something goes wrong.

