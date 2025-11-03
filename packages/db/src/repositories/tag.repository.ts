import { Prisma } from '@prisma/client';
import { AppError } from '@search-hub/schemas';
import { prisma } from '../client.js';

export const tagRepository = {
    findByIdWithCount: async (tagId: string, tenantId: string) => {
        try {
            return await prisma.tag.findFirst({
                where: { id: tagId, tenantId },
                include: {
                    _count: {
                        select: { documentTags: true },
                    },
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'findByIdWithCount',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch tag',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'findByIdWithCount',
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
                            domain: 'tags',
                            resource: 'Tag',
                            resourceId: tagId,
                            operation: 'findByIdWithCount',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },

    listTags: async (
        tenantId: string,
        options?: {
            includeCount?: boolean;
            sortBy?: 'name' | 'createdAt' | 'documentCount';
            order?: 'asc' | 'desc';
        }
    ) => {
        try {
            const {
                includeCount = false,
                sortBy = 'name',
                order = 'asc',
            } = options || {};

            return await prisma.tag.findMany({
                where: { tenantId },
                orderBy:
                    sortBy === 'name' ? { name: order } : { createdAt: order },
                ...(includeCount && {
                    include: {
                        _count: {
                            select: { documentTags: true },
                        },
                    },
                }),
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    operation: 'list',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch tags',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    operation: 'list',
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
                            domain: 'tags',
                            resource: 'Tag',
                            operation: 'list',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },

    createTag: async ({
        tenantId,
        userId,
        name,
        color,
        description,
    }: {
        tenantId: string;
        userId: string;
        name: string;
        color?: string | null;
        description?: string | null;
    }) => {
        try {
            return await prisma.tag.create({
                data: {
                    tenantId,
                    createdById: userId,
                    name,
                    color,
                    description,
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2002': {
                        // Unique constraint violation (tenantId, name)
                        const target = error.meta?.target;
                        if (
                            (Array.isArray(target) &&
                                target.includes('name')) ||
                            (typeof target === 'string' &&
                                target.includes('name'))
                        ) {
                            throw AppError.conflict(
                                'TAG_NAME_EXISTS',
                                'Tag with this name already exists in workspace',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tags',
                                        resource: 'Tag',
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    operation: 'create',
                                    metadata: {
                                        prismaCode: error.code,
                                        target,
                                    },
                                },
                            }
                        );
                    }

                    case 'P2003': {
                        // Foreign key constraint violation
                        const target = error.meta?.field_name;
                        if (typeof target === 'string') {
                            if (target.includes('tenantId')) {
                                throw AppError.notFound(
                                    'TENANT_NOT_FOUND',
                                    'Tenant not found',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'tags',
                                            resource: 'Tag',
                                            operation: 'create',
                                            metadata: { field: 'tenantId' },
                                        },
                                    }
                                );
                            }
                            if (target.includes('createdById')) {
                                throw AppError.validation(
                                    'INVALID_USER_ID',
                                    'Invalid user ID provided',
                                    {
                                        context: {
                                            origin: 'database',
                                            domain: 'tags',
                                            resource: 'Tag',
                                            operation: 'create',
                                            metadata: {
                                                field: 'createdById',
                                            },
                                        },
                                    }
                                );
                            }
                        }
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Invalid reference in tag creation',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    operation: 'create',
                                    metadata: {
                                        prismaCode: error.code,
                                        target,
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to create tag',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
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
                            domain: 'tags',
                            resource: 'Tag',
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

    updateTag: async ({
        tagId,
        tenantId,
        name,
        color,
        description,
    }: {
        tagId: string;
        tenantId: string;
        name?: string;
        color?: string | null;
        description?: string | null;
    }) => {
        try {
            // First verify tag exists and belongs to tenant
            const tag = await prisma.tag.findFirst({
                where: { id: tagId, tenantId },
            });

            if (!tag) {
                return null;
            }

            // Update and return the updated tag
            return await prisma.tag.update({
                where: { id: tagId },
                data: {
                    ...(name !== undefined && { name }),
                    ...(color !== undefined && { color }),
                    ...(description !== undefined && { description }),
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2002': {
                        // Unique constraint violation (duplicate name)
                        const target = error.meta?.target;
                        if (
                            (Array.isArray(target) &&
                                target.includes('name')) ||
                            (typeof target === 'string' &&
                                target.includes('name'))
                        ) {
                            throw AppError.conflict(
                                'TAG_NAME_EXISTS',
                                'Tag with this name already exists in workspace',
                                {
                                    context: {
                                        origin: 'database',
                                        domain: 'tags',
                                        resource: 'Tag',
                                        resourceId: tagId,
                                        operation: 'update',
                                        metadata: { field: 'name' },
                                    },
                                }
                            );
                        }
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Unique constraint violation',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'update',
                                    metadata: {
                                        prismaCode: error.code,
                                        target,
                                    },
                                },
                            }
                        );
                    }

                    case 'P2025': // Record not found
                        throw AppError.notFound(
                            'TAG_NOT_FOUND',
                            'Tag not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'update',
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'update',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to update tag',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'update',
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
                            domain: 'tags',
                            resource: 'Tag',
                            resourceId: tagId,
                            operation: 'update',
                            metadata: { message: error.message },
                        },
                    }
                );
            }

            // Re-throw unexpected errors
            throw error;
        }
    },

    deleteTag: async (tagId: string, tenantId: string) => {
        try {
            const result = await prisma.tag.deleteMany({
                where: { id: tagId, tenantId },
            });
            return result.count;
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025': // Record not found
                        throw AppError.notFound(
                            'TAG_NOT_FOUND',
                            'Tag not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'delete',
                                },
                            }
                        );

                    case 'P2003': // Foreign key constraint violation
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Cannot delete tag with existing references',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
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
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
                                    operation: 'delete',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );

                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to delete tag',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'tags',
                                    resource: 'Tag',
                                    resourceId: tagId,
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
                            domain: 'tags',
                            resource: 'Tag',
                            resourceId: tagId,
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
};
