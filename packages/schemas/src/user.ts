import { z } from 'zod';
import { Id, IsoDate } from './common.js';
import { TenantMembership } from './tenantMembership.js';

export const User = z.object({
    id: Id.meta({
        description: 'User Id',
        example: 'user123',
    }),
    email: z.email().meta({
        description: 'User email',
        example: 'user@email.com',
    }),

    passwordHash: z.string(),

    memberships: z.array(TenantMembership).default([]),

    createdAt: IsoDate.optional(),
    updatedAt: IsoDate.optional(),
});

export type User = z.infer<typeof User>;

export const UserProfile = User.omit({
    passwordHash: true,
});
