# Search Hub

A multi-tenant knowledge and productivity platform — blending search, semantic understanding, and inline AI commands that can execute even when you’re away.

## Table of Contents
- [Search Hub](#search-hub)
  - [Table of Contents](#table-of-contents)
  - [Highlights](#highlights)
  - [Core Capabilities](#core-capabilities)
    - [Capture \& Organize](#capture--organize)
    - [Search \& Retrieval](#search--retrieval)
    - [Reliability \& Observability](#reliability--observability)
  - [Architecture \& Stack](#architecture--stack)
    - [Runtime \& Tooling](#runtime--tooling)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Background Workers](#background-workers)
    - [Data \& Search](#data--search)
    - [AI Integrations](#ai-integrations)
    - [File Storage \& CDN](#file-storage--cdn)
    - [Observability](#observability)
    - [Reliability \& Security](#reliability--security)
    - [CI/CD \& Deployment](#cicd--deployment)
  - [Architecture Decision Records](#architecture-decision-records)
  - [Why These Choices Work Together](#why-these-choices-work-together)
- [🏢 Tenant Structure](#-tenant-structure)
    - [Concept](#concept)
    - [Session Management](#session-management)
    - [Tenant Switcher](#tenant-switcher)
- [📄 Document Display](#-document-display)
    - [Dashboard Landing](#dashboard-landing)
    - [Document Page Layout](#document-page-layout)
    - [Indexing Status](#indexing-status)
    - [Command Activity Timeline](#command-activity-timeline)
- [⚙️ Flow of the Project](#️-flow-of-the-project)
    - [1. Tenant Creation \& Onboarding](#1-tenant-creation--onboarding)
    - [2. Document Creation](#2-document-creation)
    - [3. Async Tasks](#3-async-tasks)
    - [4. Command Ingestion](#4-command-ingestion)
    - [5. Search](#5-search)
    - [6. Notifications](#6-notifications)

## Highlights
- Hybrid retrieval via Reciprocal Rank Fusion (RRF) keeps both lexical and semantic results relevant.
- Direct-to-S3 uploads, CloudFront caching, and content-hash keys make file handling fast and safe.
- Background workers, rate limiting, and circuit breakers keep `/search` responsive even when AI providers wobble.
- Unified observability stack (traces, logs, metrics) powers Grafana dashboards and alerting.

## Core Capabilities
### Capture & Organize
- Markdown note authoring with tagging.
- Attachments for PDFs and images stored on S3 with immutable content hashes.

### Search & Retrieval
- PostgreSQL full-text search for precise keyword matches.
- pgvector-backed embeddings for semantic recall.
- RRF fusion of lexical and vector rankings, with tag and date filters.

### Reliability & Observability
- Token-bucket rate limiting on critical routes (`/ai/*`, `/search`).
- Idempotent background jobs with exponential backoff + jitter to prevent retry storms.
- OpenTelemetry spans from UI → API → DB/Redis/OpenAI, structured logging with Pino, and Prometheus metrics surfaced in Grafana dashboards and alerts.

## Architecture & Stack
### Runtime & Tooling
- **Node.js** 22 LTS with **TypeScript**
- **pnpm** workspaces (>= 10)

### Frontend
- **Next.js** + **React** + **TypeScript**
- **Tailwind CSS** and **shadcn/ui** for styling

### Backend
- **Express** (TypeScript)
- **Zod** for input validation
- **Pino** for structured logging

### Background Workers
- Redis + BullMQ (Upstash) for queues, retries, priorities, and metrics
- Idempotency via content hashes; exponential backoff with jitter and a circuit breaker for external calls
- Queue depth, throughput, and failure metrics exported for dashboards

### Data & Search
- PostgreSQL 17 (Neon) with Prisma ORM
- pgvector for embeddings and similarity search
- PostgreSQL FTS (`tsvector`) for lexical search
- Hybrid retrieval measured with nDCG/MRR to stay within latency budgets

### AI Integrations
- Voyage for embeddings and rerank
- gloq for concise summaries

### File Storage & CDN
- S3 presigned PUT uploads for browser clients (direct-to-S3)
- CloudFront for edge caching and private-bucket access via OAC

### Observability
- Traces: OpenTelemetry → Grafana Cloud Tempo
- Logs: Pino JSON logs enriched with `traceId/tenantId/userId` → Grafana Cloud Loki
- Metrics: `prom-client` → Grafana Cloud Prometheus; dashboards cover route latency (p50/p95/p99), error rates, DB performance, queue health, AI outcomes; two alerts watch API p99 latency and worker failure rate

Centralized error classes with proper classification
Structured error middleware with safe message filtering
Multi-tenant context in every log entry
Trace correlation from frontend → API → database → workers

Why We Need Robust Logging & Observability
The Problem Without Proper Observability
Imagine these scenarios in your Search Hub platform:

Scenario 1: "Search is slow"

User complains search takes 10+ seconds
Without observability: You guess it's the database, AI service, or network
You waste hours checking everything manually
Can't reproduce the issue consistently
Scenario 2: "Users can't sign in"

Authentication fails for some users
Without observability: You don't know if it's rate limiting, session issues, or database problems
You can't tell which users are affected or when it started
Fix takes hours because you're debugging blind
Scenario 3: "Background jobs are failing"

Document indexing stops working
Without observability: You don't know which documents failed, why, or when
Users complain about missing search results
You have to manually check every document
How Proper Observability Solves These
With observability:

Scenario 1: Metrics show search latency spike at 2:15 PM, correlated with AI API timeout in logs
Scenario 2: Error tracking shows specific users hitting rate limits, correlation IDs trace the exact failure path
Scenario 3: Queue metrics show job failures, structured logs reveal specific error patterns and affected documents

### Reliability & Security
- Graceful shutdown for API and workers
- Organization-scoped authentication across routes and queries

### CI/CD & Deployment
- GitHub Actions for type checks, linting, tests, build, Docker, and deploy
- Vercel (frontend), Render/Railway/Fly (backend)
- Neon (PostgreSQL), Upstash (Redis), Grafana Cloud (Tempo/Loki/Prometheus)
- AWS S3 + CloudFront for asset storage and delivery

## Architecture Decision Records
Architectural choices are documented in ADRs. See the index at [docs/adr/README.md](docs/adr/README.md).

## Why These Choices Work Together
- **Performance & relevancy:** Combining Postgres FTS with pgvector embeddings delivers balanced recall and precision without introducing a separate vector database.
- **Operational clarity:** Shared tracing IDs across logs, metrics, and traces give quick insight into tenant-level behaviour.
- **Resilience:** Circuit breakers, backoff, and rate limits contain third-party failures and maintain predictable latency.

# 🏢 Tenant Structure

### Concept
- **Tenant = Organization.**  
  Each tenant represents an organization or workspace.  
- **TenantMembership** links users to tenants with specific roles (`owner`, `admin`, `member`).  
  This drives authorization logic for API guards and UI visibility.

### Session Management
- Keep the **currentTenantId** in the session:
  - Store in **Express session** (server-side).
  - Mirror in **NextAuth token** so the frontend knows the active tenant.
- When a user switches tenants, update both:
  - **Client** → persist via `cookie` or `localStorage`.
  - **Server** → store in the session for subsequent requests.

### Tenant Switcher
- Provide a dropdown in the header.
- Fetch memberships from `/v1/tenants`.
- When user selects a tenant:
  - Persist selection client-side and server-side.
  - All requests automatically include the correct `tenantId`.

---

# 📄 Document Display

### Dashboard Landing
- Show **recent documents** for the selected tenant.
  - Columns: `title`, `createdAt`, `status`.
- Add filters/tabs:
  - `All`, `Drafts`, `Processing`, `Published`.

### Document Page Layout
- **Left Pane** – Metadata:
  - Tags, reminders, attachments.
- **Center Pane** – Content:
  - Markdown or LLM-generated summary.
- **Right Pane** – History:
  - Commands, workflow logs, and AI task history.

### Indexing Status
- Integrate **IndexJob** table data.
- Display status:
  - 🟡 `Processing`
  - 🟢 `Indexed`
  - 🔴 `Failed` (include Retry button)

### Command Activity Timeline
- For automated actions (reminders, summaries, etc.):
  - Show activity timeline.
  - Include next scheduled reminder or last triggered event.

---

# ⚙️ Flow of the Project

### 1. Tenant Creation & Onboarding
- Owner can create new tenants.
- Invite members via **email token**.
- Assign roles during invite or later (owner/admin/member).
- Enforce access control:
  - Only `owner` or `admin` can invite/manage members.

### 2. Document Creation
- Start from the dashboard → `New Document`.
- Choose type:
  - 📝 **Note** (inline editor)
  - 🔗 **Link** (URL ingestion)
  - 📎 **Upload** (file picker)
- On submission:
  - Save to DB.
  - Enqueue async processing jobs (indexing, reminder setup, AI digest).

### 3. Async Tasks
- Handle in background workers:
  - Indexing, summarization, reminders.
- Frontend shows **live status** using:
  - Polling or **Server-Sent Events (SSE)** from `/v1/documents/:id`.

### 4. Command Ingestion
- After document creation:
  - Parse embedded or explicit commands.
  - Attach parsed commands to the document.
  - Push jobs for:
    - Reminders 🕒
    - Formatting 🧩
    - Digest/summarization 🤖
- Store outputs (summaries, reminders) back into document fields or related tables.

### 5. Search
- Tenant-scoped search:
  - Endpoint: `/api/search`
  - Filters: command type, tags, reminder status.
  - Display snippet previews from `searchVector`.

### 6. Notifications
- Trigger reminders via worker:
  - Send **emails** or **push notifications**.
- Record each event in the `Reminder` table:
  - Prevent duplicates.
  - Show full reminder history in the document timeline.

---

**✅ Summary**
This structure enables:
- Multi-tenant isolation with role-based access.
- Seamless tenant switching and scoped data.
- Clear document workflows from creation → automation → reminders → search.
- Transparency through live indexing states and command histories.

