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
    name: z.string().min(1).max(80).meta({
        description: 'User full name',
        example: 'John Smith',
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

export const UserMembershipSummary = z.object({
    tenantId: Id,
    tenantName: z.string(),
    role: z.enum(['owner', 'admin', 'member']),
});

export const UserProfileWithSummary = UserProfile.extend({
    memberships: z.array(UserMembershipSummary).default([]),
});

export const DeleteUserPayload = z.object({
    id: Id.meta({
        description: 'User ID to delete',
        example: 'user123',
    }),
});
export type DeleteUserPayload = z.infer<typeof DeleteUserPayload>;
