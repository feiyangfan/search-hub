import { z } from 'zod';
import { Id, IsoDate } from './common.js';

// Document source enum
export const DocumentSource = z
    .enum(['editor', 'url'])
    .describe('How the document was created/imported');

// Arbitrary document metadata
export const DocumentMetadata = z
    .record(z.string(), z.any())
    .describe('Arbitrary document metadata such as tags or ingestion details.');

// Base Document schema - represents a complete database record
export const DocumentSchema = z.object({
    id: Id.meta({
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
    source: DocumentSource.meta({
        description: 'Creation source',
    }),
    sourceUrl: z.url().nullable().meta({
        description: 'Original URL when the document was generated from a link',
    }),
    content: z.string().nullable().meta({
        description: 'Markdown or raw document body',
    }),
    metadata: DocumentMetadata.meta({
        description: 'Additional metadata such as tags or ingestion info',
    }),
    createdById: Id.meta({
        description: 'User who created the document',
    }),
    updatedById: Id.meta({
        description: 'User who last updated the document',
    }),
    createdAt: IsoDate.meta({
        description: 'Document creation timestamp',
    }),
    updatedAt: IsoDate.meta({
        description: 'Document last update timestamp',
    }),
});

// Create Document request payload - only fields users can provide
// Server will generate: id, createdById, updatedById, createdAt, updatedAt
// tenantId comes from session context
export const CreateDocumentRequest = z.object({
    title: z.string().min(1).optional(), // Optional for quick creates
    source: DocumentSource.optional().default('editor'),
    sourceUrl: z.url().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: DocumentMetadata.optional().default({}),
});

// Create Document response payload
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

// Document details schema - base document + computed/relational fields
export const DocumentDetailsSchema = DocumentSchema.extend({
    isFavorite: z.boolean().meta({
        description: 'Whether the current user has favorited this document',
    }),
    commands: z
        .array(
            z.object({
                id: Id,
                body: z.unknown(),
                createdAt: IsoDate,
                userId: Id,
            })
        )
        .meta({
            description: 'Inline commands associated with this document',
        }),
});

export type DocumentDetailsType = z.infer<typeof DocumentDetailsSchema>;

// Update the response to use the new schema
export const GetDocumentDetailsResponse = z.object({
    document: DocumentDetailsSchema,
});

// Get Document details parameters
export const GetDocumentDetailsParams = z.object({
    id: Id,
});

// Document list item schema
export const DocumentListItem = z.object({
    id: Id,
    title: DocumentSchema.shape.title,
    updatedAt: DocumentSchema.shape.updatedAt,
    isFavorite: z.boolean().meta({
        description:
            'Indicator whether the document is marked as favorite by the user',
    }),
});
export type DocumentListItemType = z.infer<typeof DocumentListItem>;

// Document list result schema
export const DocumentListResult = z.object({
    items: z.array(DocumentListItem),
    total: z.coerce.number().int().min(0),
});
export type DocumentListResultType = z.infer<typeof DocumentListResult>;

const favoritesOnlyParam = z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((value) =>
        typeof value === 'string' ? value === 'true' : value
    )
    .optional();

// Get Document list parameters
export const GetDocumentListParams = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    favoritesOnly: favoritesOnlyParam.default(false),
});

export const GetDocumentListResponse = z.object({
    documents: DocumentListResult,
});
export type GetDocumentListResponseType = z.infer<
    typeof GetDocumentListResponse
>;

export const UpdateDocumentTitlePayload = z.object({
    title: z.string().trim().min(1, 'Title is required'),
});

export const UpdateDocumentTitleResponse = z.object({
    document: z.object({
        id: Id,
        title: z.string(),
    }),
});

export const UpdateDocumentContentPayload = z.object({
    content: z.string().optional(),
});

export type UpdateDocumentContentPayloadType = z.infer<
    typeof UpdateDocumentContentPayload
>;

export const UpdateDocumentContentResponse = z.object({
    document: z.object({
        id: Id,
        updatedAt: IsoDate,
    }),
});

export type UpdateDocumentContentResponseType = z.infer<
    typeof UpdateDocumentContentResponse
>;

// Reindex document endpoint
export const ReindexDocumentResponse = z.object({
    message: z.string(),
    jobId: z.string(),
});

export type ReindexDocumentResponseType = z.infer<
    typeof ReindexDocumentResponse
>;

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

export const RemindCommandPayload = z
    .object({
        kind: z.literal('remind'),
        whenText: z.string().optional().default(''), // raw user text
        whenISO: z.string().nullable().optional(), // ISO string or null
        status: z
            .enum(['scheduled', 'overdue', 'done'])
            .optional()
            .default('scheduled'),

        createdAt: IsoDate.optional(),
        updatedAt: IsoDate.optional(),
    })
    .describe('Payload for an inline remind command');

export type RemindCommandPayloadType = z.infer<typeof RemindCommandPayload>;

export const DeleteDocumentResponse = z.union([
    z.object({ status: z.literal('success') }),
    z.object({ status: z.literal('forbidden') }),
    z.object({ status: z.literal('not_found') }),
]);

export type DocumentSourceType = z.infer<typeof DocumentSource>;
export type DocumentMetadataType = z.infer<typeof DocumentMetadata>;
export type DocumentRecord = z.infer<typeof DocumentSchema>;
export type CreateDocumentRequestType = z.infer<typeof CreateDocumentRequest>;
export type CreateDocumentResponseType = z.infer<typeof CreateDocumentResponse>;
export type DocumentFavoriteRecord = z.infer<typeof DocumentFavorite>;
export type DocumentCommandRecord = z.infer<typeof DocumentCommand>;
export type GetDocumentDetailsParamsType = z.infer<
    typeof GetDocumentDetailsParams
>;
export type GetDocumentListParamsType = z.infer<typeof GetDocumentListParams>;
export type UpdateDocumentTitlePayloadType = z.infer<
    typeof UpdateDocumentTitlePayload
>;
