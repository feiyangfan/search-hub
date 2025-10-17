import { z } from 'zod';
import { Id, IsoDate } from './common.js';

export const DocumentSource = z
    .enum(['editor', 'url'])
    .describe('How the document was created/imported');

export const DocumentMetadata = z
    .record(z.string(), z.any())
    .describe('Arbitrary document metadata such as tags or ingestion details');

export const DocumentSchema = z.object({
    id: Id.optional().meta({
        description: 'Document identifier assigned by the server',
        example: 'doc_123',
    }),
    tenantId: Id.meta({
        description: 'Owning tenant identifier',
        example: 'tenant_123',
    }),
    title: z
        .string()
        .min(1)
        .meta({ description: 'Document title', example: 'Launch plan' }),
    source: DocumentSource.default('editor').meta({
        description: 'Creation source',
    }),
    sourceUrl: z.url().optional().nullable().meta({
        description: 'Original URL when the document was generated from a link',
    }),
    content: z
        .string()
        .optional()
        .meta({ description: 'Markdown or raw document body' }),
    metadata: DocumentMetadata.optional().default({}).meta({
        description: 'Additional metadata such as tags or ingestion info',
    }),
    createdById: Id.optional().meta({
        description: 'User who created the document',
    }),
    updatedById: Id.optional().meta({
        description: 'User who last updated the document',
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

export const CreateDocumentRequest = DocumentSchema.pick({
    tenantId: true,
    title: true,
    source: true,
    sourceUrl: true,
    content: true,
    metadata: true,
}).partial({
    tenantId: true,
    title: true,
    source: true,
    sourceUrl: true,
    content: true,
    metadata: true,
});

export const CreateDocumentResponse = DocumentSchema.pick({
    id: true,
    tenantId: true,
    title: true,
    source: true,
    sourceUrl: true,
    content: true,
    metadata: true,
    createdById: true,
    updatedById: true,
    createdAt: true,
    updatedAt: true,
});

export const GetDocumentDetailsParams = z.object({
    id: Id,
});

export const DocumentFavorite = z.object({
    id: Id,
    documentId: Id,
    userId: Id,
    createdAt: IsoDate,
});

export const DocumentCommandPayload = z
    .record(z.string(), z.any())
    .describe('Structured representation of an inline document command');

export const DocumentCommand = z.object({
    id: Id,
    documentId: Id,
    userId: Id,
    body: DocumentCommandPayload,
    createdAt: IsoDate,
});

export type DocumentSourceType = z.infer<typeof DocumentSource>;
export type DocumentMetadataType = z.infer<typeof DocumentMetadata>;
export type DocumentRecord = z.infer<typeof DocumentSchema>;
export type CreateDocumentRequestType = z.infer<typeof CreateDocumentRequest>;
export type CreateDocumentResponseType = z.infer<typeof CreateDocumentResponse>;
export type DocumentFavoriteRecord = z.infer<typeof DocumentFavorite>;
export type DocumentCommandRecord = z.infer<typeof DocumentCommand>;
export type GetDocumentDetailsParamsType = z.infer<typeof GetDocumentDetailsParams>;
