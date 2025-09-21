import { z } from 'zod';
import { Id, IsoDate } from './common.js';

// Metadata for a document
export const DocumentMeta = z.object({
    id: Id.optional(),
    tenantId: Id,
    title: z.string().min(1).meta({
        description: 'Title of the document',
        example: 'My Document',
    }),
    source: z.enum(['upload', 'url', 'api']).default('upload'),
    mimeType: z.string().optional().meta({
        description: 'MIME type of the document',
        example: 'application/pdf',
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
    id: Id,
    status: z.enum(['indexed', 'queued', 'failed']).default('queued'),
});
