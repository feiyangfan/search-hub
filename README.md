# Search Hub

**Your knowledge base that actually understands what you're looking for.**

Search Hub combines enterprise-grade hybrid search (lexical + semantic) with AI-powered insights. Unlike traditional note-taking apps that rely on exact keyword matches, Search Hub understands *meaning* — finding relevant documents even when you don't remember the exact words you used.

Built for teams who need more than folders and tags: intelligent search, automatic embeddings, and AI-driven automation that works while you sleep.

## Table of Contents
- [Search Hub](#search-hub)
  - [Table of Contents](#table-of-contents)
  - [What Makes Search Hub Different](#what-makes-search-hub-different)
    - [🔍 Intelligent Hybrid Search](#-intelligent-hybrid-search)
    - [🤖 AI That Works for You](#-ai-that-works-for-you)
    - [⚡ Built for Scale \& Reliability](#-built-for-scale--reliability)
    - [🎯 For Engineers Who Care About Architecture](#-for-engineers-who-care-about-architecture)
  - [Core Capabilities](#core-capabilities)
    - [Capture \& Organize](#capture--organize)
    - [AI-Powered Features](#ai-powered-features)
    - [Search \& Retrieval](#search--retrieval)
    - [Reliability \& Observability](#reliability--observability)
  - [Architecture \& Stack](#architecture--stack)
    - [Runtime \& Tooling](#runtime--tooling)
    - [Frontend](#frontend)
    - [Backend](#backend)
    - [Background Workers](#background-workers)
    - [Data \& Search](#data--search)
    - [AI Integrations](#ai-integrations)
    - [Image Storage \& CDN](#image-storage--cdn)
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
    - [4. Reminder System (MVP)](#4-reminder-system-mvp)
    - [5. Search](#5-search)
    - [6. Notifications](#6-notifications)

## What Makes Search Hub Different

### 🔍 Intelligent Hybrid Search
Not just keyword matching. Search Hub fuses **PostgreSQL full-text search** with **pgvector semantic embeddings** using Reciprocal Rank Fusion (RRF). Search for "budget concerns" and find documents about "financial worries" — because it understands concepts, not just words.

### 🤖 AI That Works for You
- **Automatic indexing**: Every document is chunked and embedded in the background (1024-dimensional vectors via Voyage AI)
- **Weekly summaries**: AI-generated digests of your workspace activity
- **Natural language reminders**: Type "remind me next Friday" and it just works (powered by chrono-node)
- **Smart reranking**: Results automatically reordered by relevance using Voyage rerank-2.5-lite

### ⚡ Built for Scale & Reliability
- **Multi-tenant from day one**: Workspace isolation baked into every query
- **Circuit breakers & rate limiting**: Graceful degradation when AI services wobble
- **Idempotent background jobs**: Safe retries with content checksums prevent duplicate work
- **Production observability**: Prometheus metrics, structured logs, distributed tracing

### 🎯 For Engineers Who Care About Architecture
This isn't just a CRUD app. It's a showcase of production patterns: hybrid search fusion, async job processing with BullMQ, Redis token-bucket rate limiting, pgvector at scale, and full-stack observability from browser to database.

## Core Capabilities

### Capture & Organize
- **WYSIWYG editor**: Rich text editing powered by Milkdown with CommonMark + GFM support
- **Block-level editing**: Drag-and-drop, inline formatting, and structured content
- **Tag system**: Workspace-scoped tags with color coding and many-to-many relationships
- **Image embedding**: Inline images stored on S3 with CloudFront delivery
- **Natural language reminders**: Parse dates like "tomorrow at 3pm" or "next Friday" using chrono-node

### AI-Powered Features
- **Document summarization**: Automatic AI-generated summaries for quick context (planned)
- **Weekly summaries**: AI-generated weekly digest of your workspace activity and key documents
- **Semantic search**: pgvector-backed embeddings via Voyage AI (voyage-3.5-lite, 1024 dimensions)
- **Smart reranking**: Voyage rerank-2.5-lite for improved search relevance
- **Future integrations**: Content generation, document Q&A, smart categorization (roadmap)

### Search & Retrieval
- **Lexical search**: PostgreSQL full-text search (FTS) with `tsvector` for precise keyword matches
- **Semantic search**: pgvector embeddings for conceptual similarity
- **Hybrid search**: RRF (Reciprocal Rank Fusion) combining both approaches for best results
- **Advanced filters**: Tag-based filtering, date ranges, favorites
- **Multi-tenant isolation**: All searches automatically scoped to current workspace

### Reliability & Observability
- **Rate limiting**: Redis token-bucket on all `/v1/*` routes to prevent abuse
- **Circuit breakers**: Protect against AI service failures with automatic fallback
- **Idempotent jobs**: Content checksums prevent redundant reindexing, safe retries
- **Comprehensive metrics**: Prometheus metrics for latency, errors, queue depth, AI performance
- **Structured logging**: Pino JSON logs with correlation IDs across the entire stack
- **Distributed tracing**: Request flows tracked from frontend → API → database → workers

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
- **Voyage AI** for embeddings (voyage-3.5-lite, 1024 dimensions) and reranking (rerank-2.5-lite)
- **Future**: LLM integration for summarization, content generation, and Q&A

### Image Storage & CDN
- **S3** for embedded Markdown images with content-addressed storage
- **CloudFront** for fast, globally-distributed image delivery with edge caching
- **Planned**: Presigned PUT uploads for direct browser-to-S3 transfers

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
- **AWS S3 + CloudFront** for image storage and CDN delivery

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
- Start from the dashboard → `New Document`
- **MVP**: Editor-only document creation
  - 📝 **Note**: WYSIWYG editor powered by Milkdown
  - Block-level editing with inline images
  - Natural language reminder parsing (e.g., "remind me tomorrow at 3pm")
- **Future iterations**: Link ingestion and file upload
- On submission:
  - Save to database
  - Enqueue async indexing job (chunking + embedding generation)
  - Parse and schedule reminders

### 3. Async Tasks
- Handle in background workers (BullMQ + Redis):
  - **Document indexing**: Text chunking (1000 chars, 100 char overlap) + embedding generation
  - **Reminders**: Scheduled notification delivery (MVP focus)
  - **Future**: Summarization, content generation, smart categorization
- Job tracking via `IndexJob` table:
  - States: `queued` → `processing` → `indexed` / `failed`
  - Idempotency via SHA-256 content checksums
- Frontend shows indexing status:
  - 🟡 Processing
  - 🟢 Indexed
  - 🔴 Failed (with retry option)

### 4. Reminder System (MVP)
- **Natural language parsing**: Uses chrono-node to parse dates
  - Examples: "tomorrow at 3pm", "next Friday", "in 2 weeks"
- **Reminder states**: scheduled, overdue, done
- **Storage**: `DocumentCommand` table tracks all reminder data
- **Scheduled delivery**: Background worker sends notifications at specified times
- **Future commands**: Formatting, summarization, content generation (post-MVP)

### 5. Search
- Tenant-scoped search:
  - Endpoint: `/api/search`
  - Filters: command type, tags, reminder status.
  - Display snippet previews from `searchVector`.

### 6. Notifications
- **Reminders**: Background worker triggers at scheduled times
- **Delivery channels**: Email notifications (push notifications in future iterations)
- **Event tracking**: All reminder deliveries logged in `DocumentCommand` table
- **Deduplication**: Idempotency prevents duplicate notifications
- **Timeline view**: Full reminder history visible in document interface

---

**✅ Summary**
This structure enables:
- Multi-tenant isolation with role-based access.
- Seamless tenant switching and scoped data.
- Clear document workflows from creation → automation → reminders → search.
- Transparency through live indexing states and command histories.

