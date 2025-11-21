# @search-hub/observability

Observability and metrics collection for Search Hub using Prometheus.

## Overview

This package provides centralized metrics collection and health check utilities for all Search Hub services. Built on `prom-client` for Prometheus-compatible metrics.

## Features

- **Prometheus metrics**: Industry-standard metrics format
- **Custom metrics**: Application-specific counters, gauges, and histograms
- **Default metrics**: Automatic Node.js runtime metrics
- **Health checks**: Service health status endpoints
- **Type-safe**: Full TypeScript support

## Installation

```bash
pnpm add @search-hub/observability
```

## Usage

### Basic Metrics

```typescript
import { metrics } from '@search-hub/observability';

// Increment a counter
metrics.searchRequests.inc({ 
    tenant_id: 'tenant_123', 
    search_type: 'hybrid' 
});

// Set a gauge value
metrics.queueDepth.set({ 
    queue_name: 'index-document',
    tenant_id: 'tenant_123' 
}, 42);

// Record a histogram observation
metrics.searchDuration.observe({ 
    tenant_id: 'tenant_123',
    search_type: 'semantic',
    status: 'success'
}, 0.125); // seconds
```

### Health Checks

```typescript
import { createHealthCheck } from '@search-hub/observability';

const healthCheck = createHealthCheck({
    checks: {
        database: async () => {
            await prisma.$queryRaw`SELECT 1`;
            return { status: 'healthy' };
        },
        redis: async () => {
            await redisClient.ping();
            return { status: 'healthy' };
        }
    }
});

// In Express route
app.get('/health', async (req, res) => {
    const health = await healthCheck.getHealth();
    res.status(health.status === 'healthy' ? 200 : 503).json(health);
});
```

### Exposing Metrics Endpoint

```typescript
import { register } from '@search-hub/observability';
import express from 'express';

const app = express();

app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});
```

## Available Metrics

### Counters

#### `auth_attempts_total`
Total authentication attempts.

**Labels:**
- `method`: sign-in, sign-up, oauth
- `status`: success, failure

```typescript
metrics.authAttempts.inc({ method: 'sign-in', status: 'success' });
```

#### `user_sign_ups_total`
Total user sign ups.

**Labels:**
- `source`: web, mobile, api

```typescript
metrics.userSignUps.inc({ source: 'web' });
```

#### `tenant_creations_total`
Total tenant creations.

```typescript
metrics.tenantCreations.inc();
```

#### `api_requests_total`
Total API requests.

**Labels:**
- `tenant_id`: Tenant identifier
- `endpoint`: API endpoint path
- `method`: HTTP method
- `status_code`: HTTP status code

```typescript
metrics.apiRequests.inc({ 
    tenant_id: 'tenant_123',
    endpoint: '/v1/documents',
    method: 'POST',
    status_code: '201'
});
```

#### `search_requests_total`
Total search requests.

**Labels:**
- `tenant_id`: Tenant identifier
- `search_type`: hybrid, semantic, lexical

```typescript
metrics.searchRequests.inc({ 
    tenant_id: 'tenant_123',
    search_type: 'hybrid'
});
```

#### `documents_created_total`
Total documents created.

**Labels:**
- `tenant_id`: Tenant identifier
- `source_type`: editor, link, api

```typescript
metrics.documentsCreated.inc({ 
    tenant_id: 'tenant_123',
    source_type: 'editor'
});
```

#### `db_errors_total`
Total database errors.

**Labels:**
- `tenant_id`: Tenant identifier
- `operation`: read, write, update, delete

```typescript
metrics.dbErrors.inc({ 
    tenant_id: 'tenant_123',
    operation: 'write'
});
```

#### `jobs_processed_total`
Total background jobs processed.

**Labels:**
- `job_type`: index_document, send_reminder
- `result`: success, failure

```typescript
metrics.jobsProcessed.inc({ 
    job_type: 'index_document',
    result: 'success'
});
```

#### `jobs_failed_total`
Total failed background jobs.

**Labels:**
- `job_type`: index_document, send_reminder
- `error_code`: error identifier

```typescript
metrics.jobsFailed.inc({ 
    job_type: 'index_document',
    error_code: 'embedding_failed'
});
```

### Gauges

#### `active_users`
Currently active users.

**Labels:**
- `tenant_id`: Tenant identifier

```typescript
metrics.activeUsers.set({ tenant_id: 'tenant_123' }, 42);
metrics.activeUsers.inc({ tenant_id: 'tenant_123' }); // +1
metrics.activeUsers.dec({ tenant_id: 'tenant_123' }); // -1
```

#### `queue_depth`
Current queue depth (pending jobs).

**Labels:**
- `queue_name`: Queue identifier
- `tenant_id`: Tenant identifier

```typescript
metrics.queueDepth.set({ 
    queue_name: 'index-document',
    tenant_id: 'tenant_123'
}, 15);
```

#### `active_jobs`
Currently processing jobs.

**Labels:**
- `job_type`: index_document, send_reminder
- `tenant_id`: Tenant identifier

```typescript
metrics.activeJobs.inc({ 
    job_type: 'index_document',
    tenant_id: 'tenant_123'
});
// After job completes
metrics.activeJobs.dec({ 
    job_type: 'index_document',
    tenant_id: 'tenant_123'
});
```

#### `circuit_breaker_state`
Circuit breaker state (0=closed, 1=open, 2=half-open).

**Labels:**
- `service`: Service name (e.g., 'voyage_ai')

```typescript
metrics.circuitBreakerState.set({ service: 'voyage_ai' }, 1); // open
```

### Histograms

#### `search_duration_seconds`
Search request duration in seconds.

**Labels:**
- `tenant_id`: Tenant identifier
- `search_type`: hybrid, semantic, lexical
- `status`: success, failure

**Buckets:** [0.05, 0.1, 0.25, 0.5, 1, 2.5, 5, 10]

```typescript
const start = Date.now();
// ... perform search ...
const duration = (Date.now() - start) / 1000;
metrics.searchDuration.observe({ 
    tenant_id: 'tenant_123',
    search_type: 'hybrid',
    status: 'success'
}, duration);
```

#### `job_duration_seconds`
Background job processing duration in seconds.

**Labels:**
- `job_type`: index_document, send_reminder
- `tenant_id`: Tenant identifier
- `result`: success, failure

**Buckets:** [1, 5, 10, 30, 60, 120, 300]

```typescript
metrics.jobDuration.observe({ 
    job_type: 'index_document',
    tenant_id: 'tenant_123',
    result: 'success'
}, 45.2);
```

#### `ai_request_duration_seconds`
AI service request duration in seconds.

**Labels:**
- `provider`: voyage, openai, etc.
- `operation`: embed, rerank, completion

**Buckets:** [0.1, 0.5, 1, 2, 5, 10, 30]

```typescript
const start = Date.now();
await voyage.embed(texts);
const duration = (Date.now() - start) / 1000;
metrics.aiRequestDuration.observe({ 
    provider: 'voyage',
    operation: 'embed'
}, duration);
```

## API Reference

### `metrics`

Object containing all custom metrics instances.

### `register`

Prometheus registry instance for metrics collection and exposure.

**Methods:**
- `metrics()`: Returns all metrics in Prometheus format
- `contentType`: MIME type for metrics response

### `getMetrics()`

Get all metrics as a string in Prometheus format.

```typescript
const metricsText = await getMetrics();
```

### `resetMetrics()`

Reset all metrics (useful for testing).

```typescript
resetMetrics();
```

### `createHealthCheck(options)`

Create a health check instance with custom checks.

**Parameters:**
- `options.checks`: Object with check functions

**Returns:** Health check instance

## Integration Examples

### In Express API

```typescript
import express from 'express';
import { metrics, register } from '@search-hub/observability';

const app = express();

// Metrics endpoint
app.get('/metrics', async (req, res) => {
    res.set('Content-Type', register.contentType);
    res.end(await register.metrics());
});

// Track API requests
app.use((req, res, next) => {
    const start = Date.now();
    
    res.on('finish', () => {
        metrics.apiRequests.inc({
            tenant_id: req.session.currentTenantId ?? 'unknown',
            endpoint: req.route?.path ?? req.path,
            method: req.method,
            status_code: String(res.statusCode)
        });
    });
    
    next();
});
```

### In Worker

```typescript
import { Worker } from 'bullmq';
import { metrics } from '@search-hub/observability';

const worker = new Worker('index-document', async (job) => {
    const { tenantId } = job.data;
    const startTime = Date.now();
    
    // Track active job
    metrics.activeJobs.inc({ 
        job_type: 'index_document',
        tenant_id: tenantId 
    });
    
    try {
        // Process job
        await processJob(job);
        
        // Record success
        const duration = (Date.now() - startTime) / 1000;
        metrics.jobDuration.observe({ 
            job_type: 'index_document',
            tenant_id: tenantId,
            result: 'success'
        }, duration);
        
        metrics.jobsProcessed.inc({ 
            job_type: 'index_document',
            result: 'success'
        });
    } catch (error) {
        // Record failure
        metrics.jobsFailed.inc({ 
            job_type: 'index_document',
            error_code: 'processing_error'
        });
        throw error;
    } finally {
        // Decrement active jobs
        metrics.activeJobs.dec({ 
            job_type: 'index_document',
            tenant_id: tenantId 
        });
    }
});
```

### With Circuit Breaker

```typescript
import { metrics } from '@search-hub/observability';

class CircuitBreaker {
    private setState(state: 'closed' | 'open' | 'half-open') {
        const stateValue = { closed: 0, open: 1, 'half-open': 2 }[state];
        metrics.circuitBreakerState.set({ 
            service: this.serviceName 
        }, stateValue);
    }
}
```

## Grafana Dashboards

Example PromQL queries for Grafana:

### Request Rate
```promql
rate(api_requests_total[5m])
```

### Error Rate
```promql
rate(api_requests_total{status_code=~"5.."}[5m]) 
/ 
rate(api_requests_total[5m])
```

### P95 Search Latency
```promql
histogram_quantile(0.95, 
    rate(search_duration_seconds_bucket[5m])
)
```

### Queue Depth Over Time
```promql
queue_depth{queue_name="index-document"}
```

### Job Success Rate
```promql
rate(jobs_processed_total{result="success"}[5m]) 
/ 
rate(jobs_processed_total[5m])
```

## Best Practices

### 1. Use Consistent Labels

Keep label cardinality low to avoid metric explosion:
```typescript
// ❌ Don't use high-cardinality values
metrics.apiRequests.inc({ user_id: userId }); // Too many users!

// ✅ Do use low-cardinality values
metrics.apiRequests.inc({ tenant_id: tenantId }); // Limited tenants
```

### 2. Track Both Attempts and Results

```typescript
// Count attempt
metrics.searchRequests.inc({ tenant_id, search_type: 'hybrid' });

const start = Date.now();
try {
    await performSearch();
    metrics.searchDuration.observe({ status: 'success' }, duration);
} catch (error) {
    metrics.searchDuration.observe({ status: 'failure' }, duration);
}
```

### 3. Use Gauges for State, Counters for Events

```typescript
// ✅ Gauge: Current state
metrics.activeJobs.set(currentJobCount);

// ✅ Counter: Events over time
metrics.jobsProcessed.inc();
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

- `prom-client`: ^15.1.3
- `@search-hub/db`: workspace:*

## See Also

- [Prometheus Documentation](https://prometheus.io/docs/)
- [prom-client Documentation](https://github.com/siimon/prom-client)
- `apps/api/src/routes/metrics.ts` - Metrics endpoint
- `apps/worker/src/index.ts` - Worker metrics integration
