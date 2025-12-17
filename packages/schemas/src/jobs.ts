import { z } from 'zod';
import { Id } from './common.js';

/**
 * Queue names (string constants) so producers and consumers agree.
 */
export const JOBS = {
    INDEX_DOCUMENT: 'index-document',
    SEND_REMINDER: 'send-reminder',
    SYNC_STALE_DOCUMENTS: 'sync-stale-documents',
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
    reindex: z
        .boolean()
        .optional()
        .default(false)
        .meta({ description: 'Explicit reindex; treated as force' }),
});

export type IndexDocumentJob = z.infer<typeof IndexDocumentJobSchema>;

export const SendReminderJobSchema = z.object({
    tenantId: Id.meta({
        description: 'The Tenant Id that owns the reminder',
        example: 'tenant_123',
    }),
    documentCommandId: Id.meta({
        description: 'The DocumentCommand Id for the reminder',
        example: 'cmd_123',
    }),
});

export type SendReminderJob = z.infer<typeof SendReminderJobSchema>;

/**
 * Sync stale documents job - no payload needed (scans all tenants)
 */
export const SyncStaleDocumentsJobSchema = z.object({});

export type SyncStaleDocumentsJob = z.infer<typeof SyncStaleDocumentsJobSchema>;
