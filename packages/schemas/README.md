# @search-hub/schemas

Shared Zod schemas and type definitions for Search Hub.

## Overview

This package contains all shared data schemas, validation logic, and TypeScript types used across the Search Hub platform. Built with Zod for runtime validation and OpenAPI spec generation.

## Features

- **Runtime validation**: Zod schemas catch invalid data at runtime
- **Type inference**: Automatic TypeScript types from schemas
- **OpenAPI generation**: Schemas automatically generate API documentation
- **Reusable**: Single source of truth for data shapes
- **Extensible**: Easy to add metadata and descriptions

## Installation

```bash
pnpm add @search-hub/schemas
```

## Usage

### Basic Validation

```typescript
import { DocumentSchema } from '@search-hub/schemas';

const result = DocumentSchema.safeParse(data);
if (!result.success) {
    console.error(result.error);
} else {
    const document = result.data; // fully typed
}
```

### Type Inference

```typescript
import { z } from 'zod';
import { SearchQuery, Document } from '@search-hub/schemas';

// Infer TypeScript types from schemas
type SearchQueryType = z.infer<typeof SearchQuery>;
type DocumentType = z.infer<typeof Document>;
```

### OpenAPI Integration

```typescript
import { SearchQuery } from '@search-hub/schemas';
import { createDocument } from 'zod-openapi';

const openapi = createDocument({
    openapi: '3.0.0',
    info: { title: 'Search Hub API', version: '1.0.0' },
    paths: {
        '/search': {
            get: {
                parameters: [
                    {
                        in: 'query',
                        name: 'q',
                        schema: SearchQuery.shape.q,
                    },
                ],
            },
        },
    },
});
```

## Available Schemas

### Common Schemas (`common.ts`)

#### `Id`
CUID identifier with metadata support.

```typescript
import { Id } from '@search-hub/schemas';

const userIdSchema = Id.meta({
    description: 'User identifier',
    example: 'user_123'
});
```

#### `Pagination`
Pagination parameters with defaults.

```typescript
import { Pagination } from '@search-hub/schemas';

const schema = z.object({
    ...Pagination.shape,
    // limit: defaults to 10, max 100
    // offset: defaults to 0
});
```

### Document Schemas (`document.ts`)

#### `DocumentSchema`
Complete document data model.

```typescript
import { DocumentSchema } from '@search-hub/schemas';

type Document = z.infer<typeof DocumentSchema>;
// {
//   id: string;
//   tenantId: string;
//   title: string;
//   source: 'editor' | 'url';
//   sourceUrl?: string;
//   content?: string;
//   summary?: string;
//   metadata?: JsonValue;
//   createdById: string;
//   updatedById: string;
//   createdAt: Date;
//   updatedAt: Date;
// }
```

#### `CreateDocumentBody`
Request body for creating documents.

```typescript
import { CreateDocumentBody } from '@search-hub/schemas';

const body = CreateDocumentBody.parse({
    title: 'My Document',
    content: 'Document content',
    source: 'editor'
});
```

#### `UpdateDocumentBody`
Request body for updating documents (all fields optional).

```typescript
import { UpdateDocumentBody } from '@search-hub/schemas';

const updates = UpdateDocumentBody.parse({
    title: 'Updated Title'
});
```

### Search Schemas (`search.ts`, `semanticQuery.ts`)

#### `SearchQuery`
Lexical search query parameters.

```typescript
import { SearchQuery } from '@search-hub/schemas';

const query = SearchQuery.parse({
    q: 'search term',
    tenantId: 'tenant_123',
    limit: 20,
    offset: 0
});
```

#### `SemanticQuery`
Semantic search with embeddings.

```typescript
import { SemanticQuery } from '@search-hub/schemas';

const query = SemanticQuery.parse({
    q: 'search term',
    tenantId: 'tenant_123',
    k: 10,           // top-k results
    recall_k: 50     // candidates before rerank
});
```

#### `HybridSearchQuery`
Combines lexical and semantic search.

```typescript
import { HybridSearchQuery } from '@search-hub/schemas';

const query = HybridSearchQuery.parse({
    q: 'search term',
    tenantId: 'tenant_123',
    limit: 20,
    lexical_weight: 0.4,
    semantic_weight: 0.6
});
```

#### `SearchResponse`
Standardized search response format.

```typescript
import { SearchResponse } from '@search-hub/schemas';

type Response = z.infer<typeof SearchResponse>;
// {
//   total: number;
//   items: SearchItem[];
//   page: number;
//   pageSize: number;
// }
```

### Auth Schemas (`auth.ts`)

#### `SignInBody`
Sign-in credentials.

```typescript
import { SignInBody } from '@search-hub/schemas';

const credentials = SignInBody.parse({
    email: 'user@example.com',
    password: 'secure-password'
});
```

#### `SignUpBody`
User registration data.

```typescript
import { SignUpBody } from '@search-hub/schemas';

const registration = SignUpBody.parse({
    email: 'user@example.com',
    password: 'secure-password',
    name: 'John Doe'
});
```

### Tenant & User Schemas (`tenant.ts`, `user.ts`, `tenantMembership.ts`)

#### `TenantSchema`
Tenant/workspace data.

```typescript
import { TenantSchema } from '@search-hub/schemas';

type Tenant = z.infer<typeof TenantSchema>;
```

#### `UserSchema`
User account data.

```typescript
import { UserSchema } from '@search-hub/schemas';

type User = z.infer<typeof UserSchema>;
```

#### `TenantMembershipSchema`
User-tenant relationship.

```typescript
import { TenantMembershipSchema } from '@search-hub/schemas';

type Membership = z.infer<typeof TenantMembershipSchema>;
// Includes role: 'owner' | 'admin' | 'member'
```

### Tag Schemas (`tag.ts`)

#### `TagSchema`
Tag/label data.

```typescript
import { TagSchema } from '@search-hub/schemas';

type Tag = z.infer<typeof TagSchema>;
// {
//   id: string;
//   tenantId: string;
//   name: string;
//   color?: string;
//   description?: string;
//   createdById: string;
//   createdAt: Date;
//   updatedAt: Date;
// }
```

#### `CreateTagBody`, `UpdateTagBody`
Tag creation and update schemas.

### Job Schemas (`jobs.ts`)

#### `JOBS`
Job type constants.

```typescript
import { JOBS } from '@search-hub/schemas';

console.log(JOBS.INDEX_DOCUMENT);  // 'index-document'
console.log(JOBS.SEND_REMINDER);   // 'send-reminder'
```

#### `IndexDocumentJobSchema`
Document indexing job payload.

```typescript
import { IndexDocumentJobSchema } from '@search-hub/schemas';

const job = IndexDocumentJobSchema.parse({
    tenantId: 'tenant_123',
    documentId: 'doc_456'
});
```

#### `SendReminderJobSchema`
Reminder notification job payload.

```typescript
import { SendReminderJobSchema } from '@search-hub/schemas';

const job = SendReminderJobSchema.parse({
    tenantId: 'tenant_123',
    documentCommandId: 'cmd_789'
});
```

### Utility Functions (`chunk.ts`, `hash.ts`)

#### `chunkText(text, chunkSize, overlap)`
Split text into overlapping chunks for embedding.

```typescript
import { chunkText } from '@search-hub/schemas';

const chunks = chunkText('long document text', 1000, 100);
// Returns: { idx: number, text: string }[]
```

**Parameters:**
- `text` (string): Text to chunk
- `chunkSize` (number, default: 1000): Maximum chunk size in characters
- `overlap` (number, default: 100): Overlap between chunks

#### `sha256(text)`
Generate SHA-256 hash for content.

```typescript
import { sha256 } from '@search-hub/schemas';

const checksum = sha256('document content');
// Returns: hex-encoded hash string
```

### Error Schemas (`errors.ts`)

#### `AppError`
Structured error class with context.

```typescript
import { AppError } from '@search-hub/schemas';

throw AppError.validation('INVALID_INPUT', 'Email is required', {
    context: {
        origin: 'api',
        domain: 'auth',
        resource: 'User',
        operation: 'create'
    }
});

// Factory methods:
AppError.validation(code, message, details?)
AppError.notFound(code, message, details?)
AppError.internal(code, message, details?)
AppError.unauthorized(code, message, details?)
```

### OpenAPI Schemas (`openapi.ts`)

Utilities for OpenAPI spec generation with zod-openapi.

## Best Practices

### 1. Use `.safeParse()` for User Input

```typescript
// ❌ Don't use .parse() directly on user input
const data = SearchQuery.parse(req.query); // throws on invalid data

// ✅ Do use .safeParse() for graceful error handling
const result = SearchQuery.safeParse(req.query);
if (!result.success) {
    return res.status(400).json({ error: result.error });
}
const data = result.data;
```

### 2. Add Metadata for OpenAPI

```typescript
import { z } from 'zod';

const DocumentIdParam = z.string().cuid().openapi({
    description: 'Document unique identifier',
    example: 'clx1234567890',
    param: { in: 'path', name: 'id' }
});
```

### 3. Reuse Common Shapes

```typescript
import { Pagination, Id } from '@search-hub/schemas';

const ListDocumentsQuery = z.object({
    tenantId: Id,
    ...Pagination.shape,
    sortBy: z.enum(['createdAt', 'title']).optional()
});
```

### 4. Export Both Schema and Type

```typescript
// In schema file
export const UserSchema = z.object({ /* ... */ });
export type User = z.infer<typeof UserSchema>;

// In consuming code
import { UserSchema, type User } from '@search-hub/schemas';
```

## Integration Examples

### In API Routes (Validation)

```typescript
import { validateBody } from '../middleware/validateMiddleware';
import { CreateDocumentBody } from '@search-hub/schemas';

router.post('/documents', 
    validateBody(CreateDocumentBody),
    async (req, res) => {
        // req.validated.body is fully typed
        const doc = await createDocument(req.validated.body);
        res.status(201).json(doc);
    }
);
```

### In SDK Generation

```typescript
// Schemas automatically generate TypeScript types for SDK
import type { paths } from '@search-hub/sdk';

type CreateDocumentRequest = 
    paths['/v1/documents']['post']['requestBody']['content']['application/json'];
```

### In Database Layer

```typescript
import { DocumentSchema } from '@search-hub/schemas';
import { Prisma } from '@prisma/client';

// Validate Prisma results against schema
const doc = await prisma.document.findUnique({ where: { id } });
const validated = DocumentSchema.parse(doc);
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

## Schema Evolution

When updating schemas:

1. Update the Zod schema in `packages/schemas/src/`
2. Run `pnpm run openapi:genall` to regenerate API specs and SDK types
3. Update any consuming code that breaks from type changes
4. Consider backward compatibility for breaking changes

## Dependencies

- `zod`: ^4.1.11 - Runtime validation
- `zod-openapi`: ^5.4.1 - OpenAPI spec generation

## See Also

- [Zod Documentation](https://zod.dev/)
- [zod-openapi Documentation](https://github.com/samchungy/zod-openapi)
- `apps/api/src/middleware/validateMiddleware.ts` - Validation middleware
- `apps/api/scripts/generate-openapi.ts` - OpenAPI generation script
- `packages/sdk/README.md` - SDK generation from schemas
