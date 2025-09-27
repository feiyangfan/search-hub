import { z } from 'zod';
import { Id, IsoDate } from './common.js';

// Metadata for a document
export const DocumentMeta = z.object({
    id: Id.optional().meta({
        descriptions: 'document Id, assigned by the server',
        example: 'doc123',
    }),
    tenantId: Id.meta({
        description: 'Tenant ID to scope the search',
        example: 'tenant123',
    }),
    title: z.string().min(1).meta({
        description: 'Title of the document, provided by the user',
        example: 'My Document',
    }),
    source: z.enum(['upload', 'url', 'api']).default('upload').meta({
        description: 'source of the document',
        example: 'upload',
    }),
    mimeType: z.string().optional().meta({
        description: 'MIME type of the document',
        example: 'application/pdf',
    }),
    content: z.string().optional().meta({
        description: 'Document content',
        example: 'Test content',
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

// Client payload to create a document, without id and timestamps(managed by the server)
export const CreateDocumentRequest = DocumentMeta.omit({
    id: true,
    createdAt: true,
    updatedAt: true,
});

// Response after creating a document
export const CreateDocumentResponse = z.object({
    id: Id.meta({
        descriptions: 'document Id, assigned by the server',
        example: 'doc123',
    }),
    status: z.enum(['indexed', 'queued', 'failed']).default('queued'),
});
