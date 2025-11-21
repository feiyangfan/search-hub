# @search-hub/ai

AI integration package for Search Hub, providing embeddings and reranking via Voyage AI.

## Overview

This package provides a unified interface for AI operations needed by the Search Hub platform:
- **Embeddings**: Convert text into 1024-dimensional vectors using Voyage AI's `voyage-3.5-lite` model
- **Reranking**: Improve search result relevance using Voyage AI's `rerank-2.5-lite` model

## Installation

```bash
pnpm add @search-hub/ai
```

## Usage

### Creating the Voyage AI Client

```typescript
import { createVoyageHelpers } from '@search-hub/ai';

const voyage = createVoyageHelpers({ apiKey: 'your-voyage-api-key' });
```

### Generating Embeddings

```typescript
// Embed document content (for indexing)
const vectors = await voyage.embed(
    ['Document content to embed', 'Another document'],
    { input_type: 'document' }
);
// Returns: number[][] (1024-dimensional vectors)

// Embed search query
const queryVector = await voyage.embed(
    ['user search query'],
    { input_type: 'query' }
);
```

### Reranking Results

```typescript
const results = await voyage.rerank(
    'user search query',
    ['candidate doc 1', 'candidate doc 2', 'candidate doc 3']
);
// Returns: { index: number, score: number }[]
// Sorted by relevance score (higher is better)
```

## API Reference

### `createVoyageHelpers(options)`

Creates a Voyage AI client with helper methods.

**Parameters:**
- `options.apiKey` (string): Your Voyage AI API key

**Returns:** Object with `embed` and `rerank` methods

### `embed(texts, options?)`

Generate embeddings for an array of text strings.

**Parameters:**
- `texts` (string[]): Array of text to embed
- `options.model` (string, optional): Model name (default: `'voyage-3.5-lite'`)
- `options.input_type` ('document' | 'query', optional): Type of input (default: `'document'`)

**Returns:** `Promise<number[][]>` - Array of 1024-dimensional vectors

**Throws:** Error if API call fails or dimension mismatch

### `rerank(query, documents)`

Rerank documents by relevance to a query.

**Parameters:**
- `query` (string): Search query
- `documents` (string[]): Array of candidate documents

**Returns:** `Promise<{ index: number, score: number }[]>` - Array of results with original indices and relevance scores

## Implementation Details

### Embedding Model

- **Model**: `voyage-3.5-lite`
- **Output Dimension**: 1024
- **Input Types**: 
  - `document`: For content to be searched
  - `query`: For search queries
- **API Endpoint**: `https://api.voyageai.com/v1/embeddings`

### Reranking Model

- **Model**: `rerank-2.5-lite`
- **API Endpoint**: `https://api.voyageai.com/v1/rerank`
- **Returns**: Relevance scores (higher = more relevant)

### Error Handling

Both methods throw descriptive errors with:
- HTTP status codes
- Response body text
- Dimension validation for embeddings

## Integration Points

### In Worker (`apps/worker`)

```typescript
import { createVoyageHelpers } from '@search-hub/ai';
import { loadAiEnv } from '@search-hub/config-env';

const { VOYAGE_API_KEY } = loadAiEnv();
const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

// Generate embeddings for document chunks
const vectors = await voyage.embed(
    chunks.map(c => c.text),
    { input_type: 'document' }
);
```

### In Search Service (`apps/api`)

```typescript
import { createVoyageHelpers } from '@search-hub/ai';

const voyage = createVoyageHelpers({ apiKey: VOYAGE_API_KEY });

// Embed search query
const queryVector = await voyage.embed([query], { input_type: 'query' });

// Rerank semantic search candidates
const reranked = await voyage.rerank(query, candidateTexts);
```

## Development

```bash
# Build the package
pnpm build

# Run in watch mode
pnpm dev

# Type check
pnpm typecheck

# Lint
pnpm lint
```

## Dependencies

- Node.js 22+
- No external dependencies (uses native `fetch`)

## Configuration

Requires `VOYAGE_API_KEY` environment variable. See `@search-hub/config-env` for configuration management.

## Rate Limiting

This package does not implement rate limiting. Rate limiting should be handled by:
- Circuit breaker pattern in `apps/api/src/lib/circuitBreaker.ts`
- Observability metrics in `@search-hub/observability`

## See Also

- [Voyage AI Documentation](https://docs.voyageai.com/)
- `@search-hub/config-env` - Environment configuration
- `apps/api/src/services/searchService.ts` - Search service using AI
- `apps/worker/src/index.ts` - Background worker using embeddings
