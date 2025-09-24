import { z } from 'zod';
import { Id } from './common.js';

/**
 * Queue names (string constants) so producers and consumers agree.
 */
export const JOBS = {
    INDEX_DOCUMENT: 'index-document',
} as const;

/**
 * Minimal payload to identify the work.
 * Keeps the payload small and stable
 * Later add fields like { priority, mimeType, source, traceId } with defaults.
 */
export const IndexDocumentJobSchema = z.object({
    tenantId: Id.meta({
        description: 'The Tenant Id that owns the Document',
        example: 'tenant_123',
    }),
    documentId: Id.meta({
        description: 'The Document Id to be indexed',
        example: 'doc_123',
    }),
});

export type IndexDocumentJob = z.infer<typeof IndexDocumentJobSchema>;
