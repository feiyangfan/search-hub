import { z } from 'zod';
import { Id, IsoDate } from './common.js';
import { DocumentMeta } from './document.js';
import { TenantMembership } from './tenantMembership.js';

// Tenant schema
export const Tenant = z.object({
    id: Id.meta({
        description: 'Tenant ID',
        example: 'tenant123',
    }),
    name: z.string().min(1).meta({
        description: 'Name of the tenant',
        example: 'Software Inc',
    }),

    documents: z.array(DocumentMeta).meta({
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
export const CreateTenantRequest = Tenant.omit({
    id: true,
    documents: true,
    memberships: true,
    createdAt: true,
    updatedAt: true,
});

// Reponse schema for creating a tenant
export const CreateTenantResponse = z.object({
    id: Id.meta({
        description: 'Tenant ID',
        example: 'tenant123',
    }),
    name: z.string().min(1).meta({
        description: 'Name of the tenant',
        example: 'Software Inc',
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});
