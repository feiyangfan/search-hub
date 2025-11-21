# @search-hub/config-env

Environment configuration management for Search Hub with Zod validation.

## Overview

This package provides type-safe environment configuration loading for all Search Hub services. It uses Zod schemas to validate required environment variables at startup and provides typed configuration objects.

## Features

- **Type-safe configuration**: Full TypeScript support with inferred types
- **Runtime validation**: Zod schemas catch configuration errors at startup
- **Service-specific configs**: Separate loaders for API, Worker, AI, and DB services
- **Fail-fast**: Process exits with clear error messages if configuration is invalid
- **Default values**: Sensible defaults for development environments

## Installation

```bash
pnpm add @search-hub/config-env
```

## Usage

### API Service Configuration

```typescript
import { loadApiEnv } from '@search-hub/config-env';

const env = loadApiEnv();
// env is fully typed with all required API environment variables

console.log(env.DATABASE_URL);
console.log(env.PORT); // defaults to 3000
console.log(env.NODE_ENV); // defaults to 'development'
```

### Worker Configuration

```typescript
import { loadWorkerEnv } from '@search-hub/config-env';

const env = loadWorkerEnv();

console.log(env.REDIS_URL);
console.log(env.WORKER_CONCURRENCY); // defaults to 5
console.log(env.WORKER_MAX_CHUNK_LIMIT); // defaults to 5000
```

### AI Service Configuration

```typescript
import { loadAiEnv } from '@search-hub/config-env';

const env = loadAiEnv();

console.log(env.VOYAGE_API_KEY);
```

### Database Configuration

```typescript
import { loadDbEnv } from '@search-hub/config-env';

const env = loadDbEnv();

console.log(env.NODE_ENV); // 'development' | 'test' | 'production'
```

## Configuration Schemas

### ServerEnvSchema (API)

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `BASE_URL` | url | `http://localhost:3000` | External base URL |
| `NODE_ENV` | enum | `development` | Environment: development/test/production |
| `PORT` | number | `3000` | HTTP server port |
| `DATABASE_URL` | url | *required* | PostgreSQL connection string |
| `LOG_LEVEL` | enum | optional | fatal/error/warn/info/debug/trace |
| `REDIS_URL` | url | *required* | Redis connection string |
| `API_RATE_LIMIT_WINDOW_MS` | number | *required* | Rate limit window in milliseconds |
| `API_RATE_LIMIT_MAX` | number | *required* | Max requests per window |
| `API_BREAKER_FAILURE_THRESHOLD` | number | *required* | Circuit breaker failure threshold |
| `API_BREAKER_RESET_TIMEOUT_MS` | number | *required* | Circuit breaker reset timeout |
| `API_BREAKER_HALF_OPEN_TIMEOUT_MS` | number | *required* | Circuit breaker half-open timeout |
| `SESSION_SECRET` | string | *required* | Session secret (min 32 chars) |

### WorkerEnvSchema

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `REDIS_URL` | url | *required* | Redis connection string |
| `WORKER_CONCURRENCY` | number | *required* | Number of concurrent jobs (min 1) |
| `WORKER_MAX_CHUNK_LIMIT` | number | *required* | Max document chunks (min 1) |
| `VOYAGE_API_KEY` | string | *required* | Voyage AI API key |

### AiEnvSchema

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `VOYAGE_API_KEY` | string | *required* | Voyage AI API key |

### DbEnvSchema

| Variable | Type | Default | Description |
|----------|------|---------|-------------|
| `NODE_ENV` | enum | `development` | Environment: development/test/production |

## Custom .env Path

You can optionally specify a custom .env file path:

```typescript
import { loadApiEnv } from '@search-hub/config-env';

const env = loadApiEnv({ path: '/custom/path/.env' });
```

## Example .env Files

### API Service (.env)

```ini
# Database
DATABASE_URL=postgresql://searchhub:searchhub@localhost:5432/searchhub

# Redis
REDIS_URL=redis://localhost:6379

# Session
SESSION_SECRET=your-super-secret-session-key-min-32-chars

# Rate Limiting
API_RATE_LIMIT_MAX=100
API_RATE_LIMIT_WINDOW_MS=60000

# Circuit Breaker
API_BREAKER_FAILURE_THRESHOLD=5
API_BREAKER_RESET_TIMEOUT_MS=60000
API_BREAKER_HALF_OPEN_TIMEOUT_MS=5000

# AI
VOYAGE_API_KEY=your-voyage-api-key

# Server
PORT=3000
BASE_URL=http://localhost:3000
NODE_ENV=development
LOG_LEVEL=debug
```

### Worker Service (.env)

```ini
# Redis
REDIS_URL=redis://localhost:6379

# Worker Settings
WORKER_CONCURRENCY=5
WORKER_MAX_CHUNK_LIMIT=5000

# AI
VOYAGE_API_KEY=your-voyage-api-key
```

## Error Handling

If configuration validation fails, the process will:
1. Log detailed error information to console
2. Exit with code 1

Example error output:
```
[env] Invalid configuration ZodError: [
  {
    "code": "invalid_type",
    "expected": "string",
    "received": "undefined",
    "path": ["SESSION_SECRET"],
    "message": "Required"
  }
]
```

## Implementation Details

### Default .env Paths

The package automatically looks for .env files in:
- API: `apps/api/.env`
- Worker: `apps/worker/.env`
- AI: `ai/.env`

These paths are computed relative to the package location.

### Validation Strategy

1. Load .env file using `dotenv` (silent mode)
2. Parse `process.env` with appropriate Zod schema
3. If validation fails, log error and exit process
4. Return fully typed configuration object

### Zod Configuration

- **Coercion**: Numbers are coerced from strings (`z.coerce.number()`)
- **URLs**: Validated as proper URLs (`z.url()`)
- **Enums**: Strict enum validation for NODE_ENV and LOG_LEVEL
- **Min/Max**: Constraints on numeric values (e.g., SESSION_SECRET min 32 chars)

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

## Integration Points

### In API Server

```typescript
import { loadApiEnv } from '@search-hub/config-env';

const env = loadApiEnv();

app.listen(env.PORT, () => {
    console.log(`Server running on port ${env.PORT}`);
});
```

### In Worker

```typescript
import { loadWorkerEnv, loadAiEnv } from '@search-hub/config-env';

const env = loadWorkerEnv();
const { VOYAGE_API_KEY } = loadAiEnv();

const worker = new Worker('index-document', processor, {
    connection: { url: env.REDIS_URL },
    concurrency: env.WORKER_CONCURRENCY,
});
```

## Dependencies

- `dotenv`: ^17.2.2
- `zod`: ^4.1.11

## See Also

- [Zod Documentation](https://zod.dev/)
- [dotenv Documentation](https://github.com/motdotla/dotenv)
- `apps/api/src/config/env.ts` - API configuration usage
- `apps/worker/src/index.ts` - Worker configuration usage
