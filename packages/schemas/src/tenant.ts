import { z } from 'zod';
import { Id, IsoDate } from './common.js';
import { documentSchema } from './document.js';
import { TenantMembership } from './tenantMembership.js';

// Tenant schema
export const Tenant = z.object({
    id: Id.meta({
        description: 'Tenant ID',
        example: 'tenant123',
    }),
    name: z.string().trim().min(1, 'Name is required').max(24).meta({
        description: 'Name of the tenant',
        example: 'Software Inc',
    }),

    documents: z.array(documentSchema).meta({
        description: 'List of documents belonging to the tenant',
        example: [],
    }),

    memberships: z
        .array(TenantMembership)
        .meta({ description: 'Workspace memberships for this tenant' }),

    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
export type Tenant = z.infer<typeof Tenant>;

// Request schema for creating a tenant
export const CreateTenantPayload = z.object({
    name: Tenant.shape.name,
});
export type CreateTenantPayload = z.infer<typeof CreateTenantPayload>;

// Reponse schema for creating a tenant
export const CreateTenantResponse = Tenant.omit({
    memberships: true,
    documents: true,
});
export type CreateTenantResponse = z.infer<typeof CreateTenantResponse>;

export const TenantSummary = z.object({
    tenantId: Id,
    tenantName: Tenant.shape.name,
    role: TenantMembership.shape.role,
});
export type TenantSummary = z.infer<typeof TenantSummary>;

export const TenantListResponse = z.object({
    tenants: z.array(TenantSummary),
    activeTenantId: Id.nullable().optional(),
});
export type TenantListResponse = z.infer<typeof TenantListResponse>;

export const DeleteTenantPayload = z.object({
    id: Id.meta({ description: 'Tenant ID to remove' }),
});
export type DeleteTenantPayload = z.infer<typeof DeleteTenantPayload>;

export const ActiveTenantPayload = z.object({
    id: Tenant.shape.id,
});
export type ActiveTenantPayload = z.infer<typeof ActiveTenantPayload>;

// Get tenant statistics response
export const GetTenantWithStatsResponseSchema = z.object({
    id: Id,
    name: Tenant.shape.name,
    createdAt: IsoDate,
    documentCount: z.number().int().nonnegative().meta({
        description: 'Total number of documents in the tenant',
        example: 150,
    }),
    documentsCreatedThisWeek: z.number().int().nonnegative().meta({
        description: 'Number of documents created in the last 7 days',
        example: 5,
    }),
    memberCount: z.number().int().nonnegative().meta({
        description: 'Total number of members in the tenant',
        example: 10,
    }),
    tagCount: z.number().int().nonnegative().meta({
        description: 'Total number of tags in the tenant',
        example: 25,
    }),
    documents: z
        .array(
            z.object({
                id: Id,
                title: z.string(),
                updatedAt: IsoDate,
            })
        )
        .meta({
            description: 'List of documents belonging to the tenant',
            example: [],
        }),
    tags: z.array(
        z.object({
            id: Id,
            name: z.string(),
            color: z.string().nullable(),
            description: z.string().nullable(),
        })
    ),
});
export type GetTenantWithStatsResponse = z.infer<
    typeof GetTenantWithStatsResponseSchema
>;

// Activity
export const TenantActivitySchema = z.object({
    id: Id,
    tenantId: Id,
    type: z.enum([
        'document_created',
        'document_updated',
        'document_deleted',
        'document_tagged',
        'document_favorited',
    ]),
    user: z.object({
        id: Id,
        name: z.string(),
    }),
    target: z.object({
        id: Id,
        title: z.string(),
        kind: z.enum(['document', 'tag', 'other']),
    }),
    detail: z.string().nullable(),
    occuredAt: IsoDate,
    metadata: z.record(z.string(), z.any()).nullable(), // Additional metadata as key-value pairs such as icon
});

export type TenantActivityType = z.infer<typeof TenantActivitySchema>;

export const TenantActivityResponse = z.object({
    tenantId: Id,
    items: z.array(TenantActivitySchema),
});

export type TenantActivityResponseType = z.infer<typeof TenantActivityResponse>;
