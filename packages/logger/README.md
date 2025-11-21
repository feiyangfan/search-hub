# @search-hub/logger

Structured logging utilities for Search Hub using Pino.

## Overview

This package provides centralized, structured logging for all Search Hub services. Built on Pino for high-performance JSON logging with correlation support.

## Features

- **Structured JSON logging**: Machine-readable logs with consistent format
- **Correlation tracking**: Automatic request/job correlation via AsyncLocalStorage
- **Child loggers**: Component-specific loggers with inherited context
- **HTTP logging**: Middleware for request/response logging
- **Performance**: High-throughput logging via Pino

## Installation

```bash
pnpm add @search-hub/logger
```

## Usage

### Basic Logging

```typescript
import { logger } from '@search-hub/logger';

logger.info('Server started');
logger.debug({ port: 3000 }, 'Listening on port');
logger.warn({ userId: '123' }, 'Rate limit approaching');
logger.error({ err }, 'Database connection failed');
```

### Creating Child Loggers

```typescript
import { createLogger } from '@search-hub/logger';

const logger = createLogger('api');
const dbLogger = logger.child({ component: 'db' });
const authLogger = logger.child({ component: 'auth' });

// All logs from dbLogger will include { component: 'db' }
dbLogger.info({ query: 'SELECT ...' }, 'Query executed');
```

### Correlation Context

```typescript
import { correlationContext } from '@search-hub/logger';

// Set correlation context (typically in middleware)
correlationContext.run({ traceId: '123', userId: 'user_456' }, () => {
    logger.info('This log will include traceId and userId');
});
```

### HTTP Request Logging

```typescript
import { httpLogger } from '@search-hub/logger';
import express from 'express';

const app = express();
app.use(httpLogger); // Logs all HTTP requests and responses
```

## API Reference

### `createLogger(serviceName)`

Create a logger instance for a specific service.

**Parameters:**
- `serviceName` (string): Name of the service (e.g., 'api', 'worker', 'web')

**Returns:** Pino logger instance

**Example:**
```typescript
const logger = createLogger('worker');
logger.info({ jobId: '123' }, 'Job started');
```

### Pre-configured Loggers

```typescript
import { logger, dbLogger, authLogger } from '@search-hub/logger';

logger.info('General application log');
dbLogger.info({ query: 'SELECT' }, 'Database query');
authLogger.info({ userId: '123' }, 'User authenticated');
```

### `correlationContext`

AsyncLocalStorage for correlation tracking.

**Methods:**
- `run(context, callback)`: Run callback with correlation context
- `getStore()`: Get current correlation context

**Example:**
```typescript
import { correlationContext } from '@search-hub/logger';

correlationContext.run({ traceId: 'abc', tenantId: 'tenant_1' }, () => {
    // All logs in this scope will include traceId and tenantId
    logger.info('Processing request');
});
```

### `httpLogger`

Express middleware for HTTP request/response logging.

**Features:**
- Logs request start with method, path, IP
- Logs response with status code, duration
- Includes correlation IDs if available

**Example:**
```typescript
import express from 'express';
import { httpLogger } from '@search-hub/logger';

const app = express();
app.use(httpLogger);
```

## Log Levels

Pino supports the following log levels (in order of severity):

1. `fatal`: Application crash
2. `error`: Error conditions
3. `warn`: Warning conditions
4. `info`: Informational messages (default)
5. `debug`: Debug information
6. `trace`: Detailed trace information

**Setting Log Level:**
```typescript
// Via environment variable
LOG_LEVEL=debug pnpm dev

// In code (not recommended)
logger.level = 'debug';
```

## Log Format

All logs are JSON objects with:

### Base Fields
- `level`: Numeric log level
- `time`: Unix timestamp (milliseconds)
- `msg`: Human-readable message
- `pid`: Process ID
- `hostname`: Machine hostname

### Correlation Fields (when available)
- `traceId`: Request correlation ID
- `tenantId`: Current tenant context
- `userId`: Current user context
- `jobId`: Background job ID

### Custom Fields
Any additional context passed to log methods:
```typescript
logger.info({ 
    userId: '123', 
    action: 'create_document',
    duration: 45 
}, 'Document created');
```

**Output:**
```json
{
    "level": 30,
    "time": 1700000000000,
    "pid": 12345,
    "hostname": "localhost",
    "msg": "Document created",
    "userId": "123",
    "action": "create_document",
    "duration": 45,
    "traceId": "abc-123",
    "tenantId": "tenant_456"
}
```

## Integration Examples

### In Express Middleware

```typescript
import { logger } from '@search-hub/logger';
import { RequestHandler } from 'express';

export const authMiddleware: RequestHandler = (req, res, next) => {
    const log = logger.child({ component: 'auth', userId: req.session.userId });
    
    if (!req.session.userId) {
        log.warn('Unauthenticated request');
        return res.status(401).json({ error: 'Unauthorized' });
    }
    
    log.debug('Authentication successful');
    next();
};
```

### In Worker Jobs

```typescript
import { logger } from '@search-hub/logger';

const jobLogger = logger.child({ 
    service: 'worker',
    jobType: 'index-document' 
});

async function processJob(job) {
    const log = jobLogger.child({ jobId: job.id, tenantId: job.data.tenantId });
    
    log.info('Job started');
    
    try {
        // Process job
        log.info({ duration: 123 }, 'Job completed');
    } catch (error) {
        log.error({ err: error }, 'Job failed');
        throw error;
    }
}
```

### With Correlation Middleware

```typescript
import { correlationContext, logger } from '@search-hub/logger';
import { RequestHandler } from 'express';
import { randomUUID } from 'crypto';

export const correlationMiddleware: RequestHandler = (req, res, next) => {
    const traceId = req.headers['x-trace-id'] || randomUUID();
    
    correlationContext.run({ 
        traceId,
        tenantId: req.session.currentTenantId,
        userId: req.session.userId 
    }, () => {
        req.id = traceId;
        logger.info({ method: req.method, path: req.path }, 'Request started');
        next();
    });
};
```

## Best Practices

### 1. Use Structured Logging

❌ Don't:
```typescript
logger.info(`User ${userId} created document ${docId}`);
```

✅ Do:
```typescript
logger.info({ userId, docId }, 'Document created');
```

### 2. Create Child Loggers

❌ Don't:
```typescript
logger.info({ component: 'db', query: '...' }, 'Query executed');
logger.info({ component: 'db', error: '...' }, 'Query failed');
```

✅ Do:
```typescript
const dbLogger = logger.child({ component: 'db' });
dbLogger.info({ query: '...' }, 'Query executed');
dbLogger.error({ error: '...' }, 'Query failed');
```

### 3. Log at Appropriate Levels

- `debug`: Development information, verbose
- `info`: Normal operations, business events
- `warn`: Recoverable issues, approaching limits
- `error`: Errors that need attention
- `fatal`: Application crashes

### 4. Include Context

Always include relevant context in log objects:
```typescript
logger.error({ 
    err,                    // Error object
    userId,                 // Who
    operation: 'create',    // What
    resource: 'document',   // Where
    duration: 123           // When/How long
}, 'Operation failed');
```

## Performance Considerations

Pino is extremely fast because:
- Asynchronous logging (doesn't block the event loop)
- Minimal object serialization overhead
- Efficient JSON stringification

**Benchmarks**: ~30,000 operations/second per logger instance

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

- `pino`: High-performance Node.js logger
- `pino-http`: HTTP logging middleware for Pino

## See Also

- [Pino Documentation](https://getpino.io/)
- `apps/api/src/middleware/requestLoggerMiddleware.ts` - Request logging
- `apps/api/src/middleware/correlationMiddleware.ts` - Correlation context
- `apps/worker/src/index.ts` - Worker logging examples
