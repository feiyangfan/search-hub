import { Prisma } from '../../generated/prisma/client.js';
import { AppError } from '@search-hub/schemas';
import { prisma } from '../client.js';

export const userRepository = {
    create: async ({
        email,
        passwordHash,
        name,
    }: {
        email: string;
        passwordHash: string;
        name?: string;
    }) => {
        try {
            // Optimistic check for better UX (faster response)
            const found = await prisma.user.findUnique({
                where: { email },
            });

            if (found) {
                throw AppError.conflict(
                    'USER_EMAIL_EXISTS',
                    'User with this email already exists',
                    {
                        context: {
                            origin: 'app',
                            domain: 'users',
                            resource: 'User',
                            operation: 'create',
                            metadata: { field: 'email' },
                        },
                    }
                );
            }

            return await prisma.user.create({
                data: { email, passwordHash, name },
            });
        } catch (error) {
            // Re-throw AppError as-is (already properly structured)
            if (error instanceof AppError) {
                throw error;
            }

            // Handle Prisma-specific errors
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2002': {
                        // Unique constraint violation (race condition after optimistic check)
                        const target = error.meta?.target;
                        if (
                            (Array.isArray(target) &&
                                target.includes('email')) ||
                            (typeof target === 'string' &&
                                target.includes('email'))
                        ) {
                            throw AppError.conflict(
                                'USER_EMAIL_EXISTS',
                                'User with this email already exists',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'users',
                                        resource: 'User',
                                        operation: 'create',
                                        metadata: {
                                            field: 'email',
                                            reason: 'race_condition',
                                        },
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
                                    domain: 'users',
                                    resource: 'User',
                                    operation: 'create',
                                    metadata: {
                                        prismaCode: error.code,
                                        target: target,
                                    },
                                },
                            }
                        );
                    }

                    case 'P1001': // Can't reach database
                    case 'P1002': // Database timeout
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to create user',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
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
                            domain: 'users',
                            resource: 'User',
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

    deleteSelf: async ({
        userId,
        requesterId,
    }: {
        userId: string;
        requesterId: string;
    }) => {
        try {
            // Authorization check - only users can delete themselves
            if (userId !== requesterId) {
                throw AppError.authorization(
                    'USER_DELETE_FORBIDDEN',
                    'You do not have permission to delete this user',
                    {
                        context: {
                            origin: 'app',
                            domain: 'users',
                            resource: 'User',
                            resourceId: userId,
                            operation: 'delete',
                            metadata: { requesterId },
                        },
                    }
                );
            }

            // Business rule check - can't delete if they own tenants
            const ownsTenant = await prisma.tenantMembership.findFirst({
                where: { userId, role: 'owner' },
                select: { tenantId: true },
            });

            if (ownsTenant) {
                throw AppError.validation(
                    'USER_OWNS_TENANT',
                    'Transfer or delete owned tenants before deleting the user',
                    {
                        context: {
                            origin: 'app',
                            domain: 'users',
                            resource: 'User',
                            resourceId: userId,
                            operation: 'delete',
                            metadata: {
                                ownedTenantId: ownsTenant.tenantId,
                            },
                        },
                    }
                );
            }

            await prisma.user.delete({ where: { id: userId } });
        } catch (error) {
            // Re-throw AppError as-is
            if (error instanceof AppError) {
                throw error;
            }

            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025': // Record not found
                        throw AppError.notFound(
                            'USER_NOT_FOUND',
                            'User not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: userId,
                                    operation: 'delete',
                                },
                            }
                        );

                    case 'P2003': // Foreign key constraint violation
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Cannot delete user with existing references',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: userId,
                                    operation: 'delete',
                                    metadata: {
                                        prismaCode: error.code,
                                        requesterId,
                                    },
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
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: userId,
                                    operation: 'delete',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to delete user',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: userId,
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
                            domain: 'users',
                            resource: 'User',
                            resourceId: userId,
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

    findByEmail: async ({ email }: { email: string }) => {
        try {
            return await prisma.user.findUnique({ where: { email } });
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
                                    domain: 'users',
                                    resource: 'User',
                                    operation: 'findByEmail',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch user',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    operation: 'findByEmail',
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
                            domain: 'users',
                            resource: 'User',
                            operation: 'findByEmail',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },

    findByProviderAccount: async (
        provider: string,
        providerAccountId: string
    ) =>
        prisma.user.findFirst({
            where: {
                oauthProvider: provider,
                oauthAccountId: providerAccountId,
            },
        }),

    upsertOAuthUser: async ({
        email,
        name,
        provider,
        providerAccountId,
    }: {
        email: string;
        name?: string;
        provider: string;
        providerAccountId: string;
    }) => {
        return prisma.user.upsert({
            where: {
                oauthProvider_oauthAccountId: {
                    oauthProvider: provider,
                    oauthAccountId: providerAccountId,
                },
            },
            update: {
                email,
                name,
            },
            create: {
                email,
                name,
                oauthProvider: provider,
                oauthAccountId: providerAccountId,
            },
        });
    },

    findById: async ({ id }: { id: string }) => {
        try {
            return await prisma.user.findUnique({ where: { id } });
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
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: id,
                                    operation: 'findById',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch user',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'users',
                                    resource: 'User',
                                    resourceId: id,
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
                            domain: 'users',
                            resource: 'User',
                            resourceId: id,
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
};
