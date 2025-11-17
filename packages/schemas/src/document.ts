import { z } from 'zod';
import { Id, IsoDate } from './common.js';

// Document source enum
export const documentSourceSchema = z
    .enum(['editor', 'url'])
    .describe('How the document was created/imported');

export type DocumentSourceType = z.infer<typeof documentSourceSchema>;

// Arbitrary document metadata
export const documentMetadataSchema = z
    .record(z.string(), z.any())
    .describe('Arbitrary document metadata such as tags or ingestion details.');

export type DocumentMetadataType = z.infer<typeof documentMetadataSchema>;

// Base Document schema - represents a complete database record
export const documentIconEmojiSchema = z
    .string()
    .trim()
    .min(1, 'Emoji cannot be empty')
    .max(16, 'Emoji must be 16 characters or fewer')
    .describe('Emoji used to visually represent a document');

export type DocumentIconEmojiType = z.infer<typeof documentIconEmojiSchema>;

export const documentSchema = z.object({
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
    source: documentSourceSchema.meta({
        description: 'Creation source',
    }),
    sourceUrl: z.url().nullable().meta({
        description: 'Original URL when the document was generated from a link',
    }),
    content: z.string().nullable().meta({
        description: 'Markdown or raw document body',
    }),
    metadata: documentMetadataSchema.meta({
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

export type DocumentType = z.infer<typeof documentSchema>;

// Create Document request payload - only fields users can provide
// Server will generate: id, createdById, updatedById, createdAt, updatedAt
// tenantId comes from session context
export const createDocumentRequestSchema = z.object({
    title: z.string().min(1).optional(), // Optional for quick creates
    source: documentSourceSchema.optional().default('editor'),
    sourceUrl: z.url().nullable().optional(),
    content: z.string().nullable().optional(),
    metadata: documentMetadataSchema.optional().default({}),
});

export type CreateDocumentRequestType = z.infer<
    typeof createDocumentRequestSchema
>;

// Create Document response payload
export const createDocumentResponseSchema = documentSchema.pick({
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

export type CreateDocumentResponseType = z.infer<
    typeof createDocumentResponseSchema
>;

// Document details schema - base document + computed/relational fields
export const documentDetailsSchema = documentSchema.extend({
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

export type DocumentDetailsType = z.infer<typeof documentDetailsSchema>;

// Update the response to use the new schema
export const getDocumentDetailsResponseSchema = z.object({
    document: documentDetailsSchema,
});

export type GetDocumentDetailsResponseType = z.infer<
    typeof getDocumentDetailsResponseSchema
>;

// Get Document details parameters
export const getDocumentDetailsParamsSchema = z.object({
    id: Id,
});

export type GetDocumentDetailsParamsType = z.infer<
    typeof getDocumentDetailsParamsSchema
>;

// Document list item schema
export const documentListItemSchema = z.object({
    id: Id,
    title: documentSchema.shape.title,
    updatedAt: documentSchema.shape.updatedAt,
    isFavorite: z.boolean().meta({
        description:
            'Indicator whether the document is marked as favorite by the user',
    }),
});

export type DocumentListItemType = z.infer<typeof documentListItemSchema>;

// Document list result schema
export const documentListResultSchema = z.object({
    items: z.array(documentListItemSchema),
    total: z.coerce.number().int().min(0),
});

export type DocumentListResultType = z.infer<typeof documentListResultSchema>;

const favoritesOnlyParamSchema = z
    .union([z.boolean(), z.literal('true'), z.literal('false')])
    .transform((value) =>
        typeof value === 'string' ? value === 'true' : value
    )
    .optional();

// Get Document list parameters
export const getDocumentListParamsSchema = z.object({
    limit: z.coerce.number().int().min(1).max(100).default(20),
    offset: z.coerce.number().int().min(0).default(0),
    favoritesOnly: favoritesOnlyParamSchema.default(false),
});

export type GetDocumentListParamsType = z.infer<
    typeof getDocumentListParamsSchema
>;

export const getDocumentListResponseSchema = z.object({
    documents: documentListResultSchema,
});
export type GetDocumentListResponseType = z.infer<
    typeof getDocumentListResponseSchema
>;

export const updateDocumentTitlePayloadSchema = z.object({
    title: z.string().trim().min(1, 'Title is required'),
});

export type UpdateDocumentTitlePayloadType = z.infer<
    typeof updateDocumentTitlePayloadSchema
>;

export const updateDocumentTitleResponseSchema = z.object({
    document: z.object({
        id: Id,
        title: z.string(),
    }),
});

export type UpdateDocumentTitleResponseType = z.infer<
    typeof updateDocumentTitleResponseSchema
>;

export const updateDocumentContentPayloadSchema = z.object({
    content: z.string().optional(),
});

export type UpdateDocumentContentPayloadType = z.infer<
    typeof updateDocumentContentPayloadSchema
>;

export const updateDocumentContentResponseSchema = z.object({
    document: z.object({
        id: Id,
        updatedAt: IsoDate,
    }),
});

export type UpdateDocumentContentResponseType = z.infer<
    typeof updateDocumentContentResponseSchema
>;

export const updateDocumentIconPayloadSchema = z.object({
    iconEmoji: documentIconEmojiSchema.nullable().optional(),
});

export type UpdateDocumentIconPayloadType = z.infer<
    typeof updateDocumentIconPayloadSchema
>;

export const updateDocumentIconResponseSchema = z.object({
    document: z.object({
        id: Id,
        iconEmoji: documentIconEmojiSchema.nullable(),
    }),
});

export type UpdateDocumentIconResponseType = z.infer<
    typeof updateDocumentIconResponseSchema
>;

// Reindex document endpoint
export const reindexDocumentResponseSchema = z.object({
    message: z.string(),
    jobId: z.string(),
});

export type ReindexDocumentResponseType = z.infer<
    typeof reindexDocumentResponseSchema
>;

export const documentCommandPayloadSchema = z
    .record(z.string(), z.any())
    .describe('Structured representation of an inline document command');

export type DocumentCommandPayloadType = z.infer<
    typeof documentCommandPayloadSchema
>;

export const documentCommandSchema = z.object({
    id: Id,
    documentId: Id,
    userId: Id,
    body: documentCommandPayloadSchema,
    createdAt: IsoDate,
});

export type DocumentCommandType = z.infer<typeof documentCommandSchema>;

export const remindCommandPayloadSchema = z
    .object({
        kind: z.literal('remind'),
        id: z.string().optional(), // Stable reminder ID across syncs
        whenText: z.string().optional().default(''), // raw user text
        whenISO: z.string().nullable().optional(), // ISO string or null
        status: z
            .enum(['scheduled', 'notified', 'overdue', 'done'])
            .optional()
            .default('scheduled'),

        createdAt: IsoDate.optional(),
        updatedAt: IsoDate.optional(),
    })
    .describe('Payload for an inline remind command');

export type RemindCommandPayloadType = z.infer<
    typeof remindCommandPayloadSchema
>;

export const deleteDocumentResponseSchema = z.union([
    z.object({ status: z.literal('success') }),
    z.object({ status: z.literal('forbidden') }),
    z.object({ status: z.literal('not_found') }),
]);

export type DeleteDocumentResponseType = z.infer<
    typeof deleteDocumentResponseSchema
>;

// Favorite Document schemas
export const favoriteDocumentResponseSchema = z.object({
    message: z.string(),
});

export type FavoriteDocumentResponseType = z.infer<
    typeof favoriteDocumentResponseSchema
>;

// Unfavorite Document schemas
export const unfavoriteDocumentResponseSchema = z.object({
    message: z.string(),
});

export type UnfavoriteDocumentResponseType = z.infer<
    typeof unfavoriteDocumentResponseSchema
>;

// Reminder schemas
export const reminderStatusSchema = z.enum([
    'scheduled',
    'notified',
    'done',
    'overdue',
]);

export type ReminderStatusType = z.infer<typeof reminderStatusSchema>;

export const reminderItemSchema = z.object({
    id: Id.meta({
        description: 'Document command ID',
        example: 'cmd_123',
    }),
    documentId: Id.meta({
        description: 'Associated document ID',
        example: 'doc_123',
    }),
    documentTitle: z.string().meta({
        description: 'Title of the associated document',
        example: 'Meeting Notes',
    }),
    body: z.any().meta({
        description: 'Reminder command payload',
    }),
    createdAt: IsoDate.meta({
        description: 'When the reminder was created',
    }),
});

export type ReminderItemType = z.infer<typeof reminderItemSchema>;

export const getPendingRemindersResponseSchema = z.object({
    reminders: z.array(reminderItemSchema),
});

export type GetPendingRemindersResponseType = z.infer<
    typeof getPendingRemindersResponseSchema
>;

export const documentReminderStatusSchema = z.object({
    id: Id.meta({
        description: 'Document command ID',
        example: 'cmd_123',
    }),
    reminderId: z.string().optional().meta({
        description: 'Stable reminder ID (from body.id)',
        example: 'abc-123',
    }),
    status: reminderStatusSchema.meta({
        description: 'Current reminder status',
        example: 'scheduled',
    }),
    whenISO: z.string().optional().meta({
        description: 'ISO timestamp when reminder should fire',
        example: '2025-11-12T10:00:00.000Z',
    }),
    whenText: z.string().optional().meta({
        description: 'Natural language reminder time',
        example: 'tomorrow at 10am',
    }),
});

export type DocumentReminderStatusType = z.infer<
    typeof documentReminderStatusSchema
>;

export const getDocumentRemindersResponseSchema = z.object({
    reminders: z.array(documentReminderStatusSchema),
});

export type GetDocumentRemindersResponseType = z.infer<
    typeof getDocumentRemindersResponseSchema
>;

export const dismissReminderResponseSchema = z.object({
    success: z.boolean(),
});

export type DismissReminderResponseType = z.infer<
    typeof dismissReminderResponseSchema
>;
