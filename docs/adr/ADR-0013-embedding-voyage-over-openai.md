# ADR-0013: Choose **Voyage** for Embeddings (and Reranking) over OpenAI Embeddings

**Status**: Accepted  
**Date**: 2025-09-27  
**Owners**: Search Hub team (API, Worker)  
**Related**: (Queue + Worker), (pgvector + semantic search), Reranking integration

---

## Context

We need an embeddings provider for:

- **Document indexing** (worker): chunk → embed → store in Postgres `pgvector`
- **Query-time embeddings** (API): embed search query → cosine search
- **Optional reranking** to improve result ordering

Key constraints:

- **Cost sensitivity** for dev and small prod
- **Simple integration** (plain REST, Node-friendly)
- **Vector size flexibility** to balance quality × storage
- **Good recall/precision** on general knowledge content
- **Avoid single-vendor lock-in** (we already use Groq for generation)

---

## Decision

Adopt **Voyage** as the primary provider for **embeddings** and **reranking**:

- **Embeddings**: default model `voyage-3.5-lite`, **1024-dim** vectors  
- **Reranking**: default model `rerank-2.5-lite` (upgrade to `2.5` if needed)  
- **Vector DB**: Postgres `pgvector` with `vector(1024)` and cosine ivfflat index  
- **Integration**: shared helper package `@search-hub/ai` calling Voyage `/v1/embeddings` and `/v1/rerank`

OpenAI remains an **optional fallback** (feature-flagged) if we need to switch providers quickly.

---

## Alternatives Considered

1) **OpenAI embeddings (`text-embedding-3` family)**
   - **Pros**: high quality, mature ecosystem.
   - **Cons**: smaller/no free allowance; common dim (1536) increases storage; no native reranker.

2) **Local embeddings (e5/bge via Transformers)**
   - **Pros**: $0 cloud cost, full control.
   - **Cons**: infra/ops burden, slower on CPU, no hosted rerank.

3) **Other hosted providers (e.g., Cohere)**
   - **Pros**: strong models, enterprise features.
   - **Cons**: pricing/quotas less friendly for small deployments; multiple APIs to learn.

---

## Why Voyage (Decision Drivers)

- **Generous free token allowance** → keeps **dev/small prod near $0**.
- **Flexible dimensions** (256/512/**1024**/2048) → standardize on **1024** to balance quality and storage.
- **Quality**: modern models with solid retrieval performance; built-in reranking.
- **Simplicity**: one vendor covers **embeddings + rerank** via simple REST.
- **Interchangeability**: helper abstraction lets us swap providers later with minimal code changes.
- **Operational fit**: pairs well with **Groq** (Groq doesn’t provide embeddings).

---

## Architecture Impact

- **Schema**: `DocumentChunk.embedding` stored as `vector(1024)`.
- **Indexing**: Worker uses `input_type="document"`; API uses `input_type="query"`.
- **Search**: cosine **distance** operator `<=>` in pgvector; **similarity = 1 - distance**.
- **Reranking**: recall top-N (e.g., 50) via pgvector → rerank with Voyage → return top-K (e.g., 10).
- **Quality knobs**: thresholds (e.g., similarity ≥ 0.5 or rerank ≥ 0.6), lexical prefilter, per-document dedupe.

---

## Implementation Notes

- Shared package: `packages/ai`
  - `voyageEmbed(texts, { inputType, outputDimension })`
  - `embedDocuments(text[])` (worker ingestion)
  - `embedQuery(text)` (API queries)
  - (Optional) `voyageRerank(query, documents[])`
- Env vars (API & Worker):
