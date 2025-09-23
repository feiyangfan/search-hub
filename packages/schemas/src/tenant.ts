import { z } from 'zod';
import { Id, IsoDate } from './common.js';
import { DocumentMeta } from './document.js';
import { User } from './user.js';

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
    users: z.array(User).meta({
        description: 'List of user IDs associated with the tenant',
        example: [],
    }),
    documents: z.array(DocumentMeta).meta({
        description: 'List of documents belonging to the tenant',
        example: [],
    }),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

// Request schema for creating a tenant
export const CreateTenantRequest = Tenant.omit({
    id: true,
    users: true,
    documents: true,
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
