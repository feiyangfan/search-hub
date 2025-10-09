import { z } from 'zod';
import { Id, IsoDate } from './common.js';

export const TenantMembership = z.object({
    id: Id.meta({
        description: 'Membership ID',
    }),
    tenantId: Id.meta({
        description: 'Tenant ID referencing the workspace',
    }),
    userId: Id,
    role: z.enum(['owner', 'admin', 'member']).default('member'),
    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

export type TenantMembership = z.infer<typeof TenantMembership>;
