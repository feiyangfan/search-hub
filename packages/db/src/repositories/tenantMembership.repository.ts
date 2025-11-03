import { prisma } from '../client.js';
import type { UserTenant } from '../types.js';

export const tenantMembershipRepository = {
    findByUserId: async ({ userId }: { userId: string }) => {
        return prisma.tenantMembership.findMany({
            where: {
                userId: userId,
            },
        });
    },

    findUserTenantsByUserId: async ({
        userId,
    }: {
        userId: string;
    }): Promise<UserTenant[]> => {
        const memberships = await prisma.tenantMembership.findMany({
            where: {
                userId: userId,
            },
            include: {
                tenant: {
                    select: {
                        id: true,
                        name: true,
                    },
                },
            },
        });
        return memberships
            .filter((membership) => membership.tenant !== null)
            .map((membership) => ({
                tenantId: membership.tenant.id,
                tenantName: membership.tenant.name,
                role: membership.role,
            }));
    },

    findMembershipByUserIdAndTenantId: async ({
        userId,
        tenantId,
    }: {
        userId: string;
        tenantId: string;
    }) => {
        return await prisma.tenantMembership.findUnique({
            where: {
                tenantId_userId: {
                    userId: userId,
                    tenantId: tenantId,
                },
            },
        });
    },
};
