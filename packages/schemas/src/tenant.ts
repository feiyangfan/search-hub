import { z } from 'zod';
import { Id, IsoDate } from './common.js';
import { DocumentSchema } from './document.js';
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

    documents: z.array(DocumentSchema).meta({
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
