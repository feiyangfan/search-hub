import { Prisma } from '@prisma/client';
import { AppError } from '@search-hub/schemas';
import { prisma } from '../client.js';
import type { UserTenant } from '../types.js';

export const tenantRepository = {
    tenant: {
        createWithOwner: async ({
            name,
            ownerId,
        }: {
            name: string;
            ownerId: string;
        }) => {
            try {
                const tenant = await prisma.tenant.create({
                    data: {
                        name,
                        memberships: {
                            create: { userId: ownerId, role: 'owner' },
                        },
                    },
                });

                return tenant;
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2002': {
                            // Unique constraint violation
                            const target = error.meta?.target;
                            if (
                                (Array.isArray(target) &&
                                    target.includes('name')) ||
                                (typeof target === 'string' &&
                                    target.includes('name'))
                            ) {
                                throw AppError.conflict(
                                    'TENANT_NAME_EXISTS',
                                    'A tenant with this name already exists',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'tenants',
                                            resource: 'Tenant',
                                            operation: 'create',
                                            metadata: { field: 'name' },
                                        },
                                    }
                                );
                            }
                            // Fallback for other unique constraints
                            throw AppError.internal(
                                'DB_CONSTRAINT_VIOLATION',
                                'Unique constraint violation',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        operation: 'create',
                                        metadata: {
                                            prismaCode: error.code,
                                            target,
                                        },
                                    },
                                }
                            );
                        }

                        case 'P2003': // Foreign key constraint violation
                            throw AppError.validation(
                                'INVALID_OWNER_ID',
                                'Invalid user ID provided',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        operation: 'create',
                                        metadata: { field: 'ownerId' },
                                    },
                                }
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw AppError.transient(
                                'DB_CONNECTION_FAILED',
                                'Database connection failed',
                                {
                                    retryAfterMs: 5000,
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        operation: 'create',
                                        metadata: { prismaCode: error.code },
                                    },
                                }
                            );

                        default:
                            throw AppError.internal(
                                'DB_OPERATION_FAILED',
                                'Failed to create tenant',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        operation: 'create',
                                        metadata: {
                                            prismaCode: error.code,
                                            message: error.message,
                                        },
                                    },
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw AppError.internal(
                        'DB_UNKNOWN_ERROR',
                        'Database operation failed',
                        {
                            context: {
                                origin: 'database',
                                domain: 'tenants',
                                resource: 'Tenant',
                                operation: 'create',
                                metadata: { message: error.message },
                            },
                        }
                    );
                }

                // Re-throw unexpected errors
                throw error;
            }
        },
        deleteOwnedTenant: async ({
            tenantId,
            requesterId,
        }: {
            tenantId: string;
            requesterId: string;
        }) => {
            try {
                const tenantMembership =
                    await prisma.tenantMembership.findUnique({
                        where: {
                            tenantId_userId: {
                                tenantId: tenantId,
                                userId: requesterId,
                            },
                        },
                    });

                if (!tenantMembership) {
                    throw AppError.notFound(
                        'TENANT_NOT_FOUND',
                        'Tenant not found',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'delete',
                            },
                        }
                    );
                }

                if (tenantMembership.role !== 'owner') {
                    throw AppError.authorization(
                        'TENANT_DELETE_FORBIDDEN',
                        'Only the tenant owner can delete the workspace',
                        {
                            context: {
                                origin: 'app',
                                domain: 'tenants',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'delete',
                                metadata: { role: tenantMembership.role },
                            },
                        }
                    );
                }

                await prisma.tenant.delete({
                    where: { id: tenantId },
                });
            } catch (error) {
                // Re-throw AppError as-is
                if (error instanceof AppError) {
                    throw error;
                }

                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P2025': // Record not found during delete
                            throw AppError.notFound(
                                'TENANT_NOT_FOUND',
                                'Tenant not found',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'delete',
                                    },
                                }
                            );

                        case 'P2003': // Foreign key constraint violation
                            throw AppError.internal(
                                'DB_CONSTRAINT_VIOLATION',
                                'Cannot delete tenant with existing references',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'delete',
                                        metadata: { prismaCode: error.code },
                                    },
                                }
                            );

                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw AppError.transient(
                                'DB_CONNECTION_FAILED',
                                'Database connection failed',
                                {
                                    retryAfterMs: 5000,
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'delete',
                                        metadata: { prismaCode: error.code },
                                    },
                                }
                            );

                        default:
                            throw AppError.internal(
                                'DB_OPERATION_FAILED',
                                'Failed to delete tenant',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'delete',
                                        metadata: {
                                            prismaCode: error.code,
                                            message: error.message,
                                        },
                                    },
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw AppError.internal(
                        'DB_UNKNOWN_ERROR',
                        'Database operation failed',
                        {
                            context: {
                                origin: 'database',
                                domain: 'tenants',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'delete',
                                metadata: { message: error.message },
                            },
                        }
                    );
                }

                // Re-throw unexpected errors
                throw error;
            }
        },
        findById: async (tenantId: string) => {
            try {
                return await prisma.tenant.findUnique({
                    where: {
                        id: tenantId,
                    },
                });
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw AppError.transient(
                                'DB_CONNECTION_FAILED',
                                'Database connection failed',
                                {
                                    retryAfterMs: 5000,
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'findById',
                                        metadata: { prismaCode: error.code },
                                    },
                                }
                            );

                        default:
                            throw AppError.internal(
                                'DB_OPERATION_FAILED',
                                'Failed to fetch tenant',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'Tenant',
                                        resourceId: tenantId,
                                        operation: 'findById',
                                        metadata: {
                                            prismaCode: error.code,
                                            message: error.message,
                                        },
                                    },
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw AppError.internal(
                        'DB_UNKNOWN_ERROR',
                        'Database query failed',
                        {
                            context: {
                                origin: 'database',
                                domain: 'tenants',
                                resource: 'Tenant',
                                resourceId: tenantId,
                                operation: 'findById',
                                metadata: { message: error.message },
                            },
                        }
                    );
                }

                // Re-throw unexpected errors
                throw error;
            }
        },
        listForUser: async ({
            userId,
        }: {
            userId: string;
        }): Promise<UserTenant[]> => {
            try {
                const memberships = await prisma.tenantMembership.findMany({
                    where: { userId },
                    include: {
                        tenant: {
                            select: { id: true, name: true },
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
            } catch (error) {
                if (error instanceof Prisma.PrismaClientKnownRequestError) {
                    switch (error.code) {
                        case 'P1001': // Can't reach database
                        case 'P1002': // Database timeout
                            throw AppError.transient(
                                'DB_CONNECTION_FAILED',
                                'Database connection failed',
                                {
                                    retryAfterMs: 5000,
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'TenantMembership',
                                        operation: 'listForUser',
                                        metadata: { prismaCode: error.code },
                                    },
                                }
                            );

                        default:
                            throw AppError.internal(
                                'DB_OPERATION_FAILED',
                                'Failed to fetch tenant list',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tenants',
                                        resource: 'TenantMembership',
                                        operation: 'listForUser',
                                        metadata: {
                                            prismaCode: error.code,
                                            message: error.message,
                                        },
                                    },
                                }
                            );
                    }
                }

                if (error instanceof Prisma.PrismaClientUnknownRequestError) {
                    throw AppError.internal(
                        'DB_UNKNOWN_ERROR',
                        'Database query failed',
                        {
                            context: {
                                origin: 'database',
                                domain: 'tenants',
                                resource: 'TenantMembership',
                                operation: 'listForUser',
                                metadata: { message: error.message },
                            },
                        }
                    );
                }

                // Re-throw unexpected errors
                throw error;
            }
        },
    },
};
