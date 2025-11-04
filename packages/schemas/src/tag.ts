import { z } from 'zod';
import { Id, IsoDate } from './common.js';

// ============================================================================
// Tag Validation Schemas
// ============================================================================

/**
 * Base tag schema with all fields
 */
export const tagSchema = z.object({
    id: Id,
    tenantId: Id,
    name: z.string().trim().min(1).max(50),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .nullable(),
    description: z.string().max(200).nullable(),
    createdById: Id,
    createdAt: IsoDate,
    updatedAt: IsoDate,
});

export type TagType = z.infer<typeof tagSchema>;

/**
 * Tag list item (for display in lists, filters, etc.)
 */
export const tagListItemSchema = z.object({
    id: Id,
    name: z.string().trim().min(1).max(50),
    color: z
        .string()
        .regex(/^#[0-9A-Fa-f]{6}$/)
        .nullable(),
    documentCount: z.number().int().nonnegative().optional(),
});

export type TagListItemType = z.infer<typeof tagListItemSchema>;

// ============================================================================
// Tag API Request/Response Schemas
// ============================================================================

/**
 * POST /v1/tags - Create new tag
 */
export const createTagRequestSchema = z
    .object({
        name: z
            .string()
            .min(1, 'Tag name is required')
            .max(50, 'Tag name must be 50 characters or less')
            .trim()
            .regex(
                /^[a-zA-Z0-9-_ ]+$/,
                'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
            ),
        color: z
            .string()
            .regex(
                /^#[0-9A-Fa-f]{6}$/,
                'Color must be a valid hex color (e.g., #FF5733)'
            )
            .optional()
            .nullable(),
        description: z
            .string()
            .max(200, 'Description must be 200 characters or less')
            .optional()
            .nullable(),
    })
    .strict();

export type CreateTagRequestType = z.infer<typeof createTagRequestSchema>;

export const createTagResponseSchema = z.object({
    tag: tagSchema,
});

export type CreateTagResponseType = z.infer<typeof createTagResponseSchema>;

/**
 * PATCH /v1/tags/:id - Update tag
 */
export const updateTagParamsSchema = z.object({
    id: Id,
});

export type UpdateTagParamsType = z.infer<typeof updateTagParamsSchema>;

export const updateTagRequestSchema = z
    .object({
        name: z
            .string()
            .min(1, 'Tag name is required')
            .max(50, 'Tag name must be 50 characters or less')
            .trim()
            .regex(
                /^[a-zA-Z0-9-_ ]+$/,
                'Tag name can only contain letters, numbers, spaces, hyphens, and underscores'
            )
            .optional(),
        color: z
            .string()
            .regex(
                /^#[0-9A-Fa-f]{6}$/,
                'Color must be a valid hex color (e.g., #FF5733)'
            )
            .optional()
            .nullable(),
        description: z
            .string()
            .max(200, 'Description must be 200 characters or less')
            .optional()
            .nullable(),
    })
    .strict()
    .refine(
        (data) =>
            data.name !== undefined ||
            data.color !== undefined ||
            data.description !== undefined,
        { message: 'Provide at least one of name, color, or description.' }
    ); // Reject unknown keys

export type UpdateTagRequestType = z.infer<typeof updateTagRequestSchema>;

export const updateTagResponseSchema = z.object({
    tag: tagSchema,
});

export type UpdateTagResponseType = z.infer<typeof updateTagResponseSchema>;

/**
 * DELETE /v1/tags/:id - Delete tag
 */
export const deleteTagResponseSchema = z.object({
    message: z.string(),
});

export type DeleteTagResponseType = z.infer<typeof deleteTagResponseSchema>;

/**
 * GET /v1/tags - List all tags in workspace
 */
export const listTagsQuerySchema = z.object({
    includeCount: z
        .enum(['true', 'false'])
        .optional()
        .transform((val) => val === 'true'),
    sortBy: z
        .enum(['name', 'createdAt', 'documentCount'])
        .optional()
        .default('name'),
    order: z.enum(['asc', 'desc']).optional().default('asc'),
});

export type ListTagsQueryType = z.infer<typeof listTagsQuerySchema>;

export const listTagsResponseSchema = z.object({
    tags: z.array(tagListItemSchema),
    total: z.number().int().nonnegative(),
});

export type ListTagsResponseType = z.infer<typeof listTagsResponseSchema>;

/**
 * GET /v1/tags/:id - Get single tag details
 */
export const getTagParamsSchema = z.object({
    id: Id,
});

export type GetTagParamsType = z.infer<typeof getTagParamsSchema>;

export const getTagResponseSchema = z.object({
    tag: tagSchema,
    documentCount: z.number().int().nonnegative(),
});

export type GetTagResponseType = z.infer<typeof getTagResponseSchema>;

// ============================================================================
// Document Tag Schemas
// ============================================================================

/**
 * DocumentTag relationship
 */
export const documentTagSchema = z.object({
    id: Id,
    documentId: Id,
    tagId: Id,
    addedById: Id,
    createdAt: IsoDate,
});

export type DocumentTagType = z.infer<typeof documentTagSchema>;

/**
 * POST /v1/documents/:id/tags - Add tags to document
 */
export const addTagsToDocumentRequestSchema = z
    .object({
        tagIds: z
            .array(Id)
            .min(1, 'At least one tag is required')
            .max(20, 'Cannot add more than 20 tags at once'),
    })
    .strict();

export type AddTagsToDocumentRequestType = z.infer<
    typeof addTagsToDocumentRequestSchema
>;

export const addTagsToDocumentResponseSchema = z.object({
    added: z.array(tagListItemSchema),
    alreadyExists: z.array(Id).optional(),
});

export type AddTagsToDocumentResponseType = z.infer<
    typeof addTagsToDocumentResponseSchema
>;

/**
 * DELETE /v1/documents/:id/tags/:tagId - Remove tag from document
 */
export const removeTagFromDocumentResponseSchema = z.object({
    message: z.string(),
});

export type RemoveTagFromDocumentResponseType = z.infer<
    typeof removeTagFromDocumentResponseSchema
>;

/**
 * GET /v1/documents/:id/tags - Get document's tags
 */
export const getDocumentTagsResponseSchema = z.object({
    tags: z.array(tagListItemSchema),
});

export type GetDocumentTagsResponseType = z.infer<
    typeof getDocumentTagsResponseSchema
>;
