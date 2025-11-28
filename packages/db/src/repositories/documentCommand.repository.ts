import { Prisma } from '@prisma/client';
import { AppError, RemindCommandPayloadType } from '@search-hub/schemas';
import { prisma } from '../client.js';

export const documentCommandRepository = {
    create: async (data: {
        documentId: string;
        userId: string;
        body: Prisma.InputJsonValue;
    }) => {
        try {
            return await prisma.documentCommand.create({ data });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2002':
                        throw AppError.conflict(
                            'COMMAND_CONFLICT',
                            'Document command already exists',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    case 'P2003':
                        throw AppError.internal(
                            'DB_CONSTRAINT_VIOLATION',
                            'Invalid reference in document command creation',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'create',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to create document command',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            operation: 'create',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },

    getById: async (id: string) => {
        try {
            return await prisma.documentCommand.findUnique({ where: { id } });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025':
                        throw AppError.notFound(
                            'COMMAND_NOT_FOUND',
                            'Document command not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: id,
                                    operation: 'getById',
                                },
                            }
                        );
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: id,
                                    operation: 'getById',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch document command',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: id,
                                    operation: 'getById',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: id,
                            operation: 'getById',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },

    getByIdWithDocument: async (id: string) => {
        try {
            return await prisma.documentCommand.findUnique({
                where: { id },
                include: {
                    document: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                throw AppError.internal(
                    'DB_OPERATION_FAILED',
                    'Failed to fetch document command with document',
                    {
                        context: {
                            origin: 'database',
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: id,
                            operation: 'getByIdWithDocument',
                            metadata: {
                                prismaCode: error.code,
                                message: error.message,
                            },
                        },
                    }
                );
            }
            throw error;
        }
    },

    updateBody: async (id: string, body: Prisma.InputJsonValue) => {
        try {
            return await prisma.documentCommand.update({
                where: { id },
                data: { body },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025':
                        throw AppError.notFound(
                            'COMMAND_NOT_FOUND',
                            'Document command not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: id,
                                    operation: 'updateBody',
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to update document command',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: id,
                                    operation: 'updateBody',
                                    metadata: {
                                        prismaCode: error.code,
                                        message: error.message,
                                    },
                                },
                            }
                        );
                }
            }
            throw error;
        }
    },

    getUserReminders: async (userId: string) => {
        try {
            return await prisma.documentCommand.findMany({
                where: {
                    userId,
                    body: {
                        path: ['kind'],
                        equals: 'remind',
                    },
                },
                include: {
                    document: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getDocumentReminders',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch document reminders',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getDocumentReminders',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            operation: 'getDocumentReminders',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },
    getTenantReminders: async (tenantId: string) => {
        try {
            return await prisma.documentCommand.findMany({
                where: {
                    body: {
                        path: ['kind'],
                        equals: 'remind',
                    },
                    document: {
                        tenantId,
                    },
                },
                include: {
                    document: {
                        select: {
                            id: true,
                            title: true,
                            tenantId: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getTenantReminders',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch tenant reminders',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getTenantReminders',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            operation: 'getTenantReminders',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },
    getRemindersForDocument: async (documentId: string, userId?: string) => {
        try {
            return await prisma.documentCommand.findMany({
                where: {
                    documentId,
                    ...(userId ? { userId } : {}),
                    body: {
                        path: ['kind'],
                        equals: 'remind',
                    },
                },
                include: {
                    document: {
                        select: {
                            id: true,
                            title: true,
                        },
                    },
                },
                orderBy: {
                    createdAt: 'desc',
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getRemindersForDocument',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to fetch reminders for document',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    operation: 'getRemindersForDocument',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            operation: 'getRemindersForDocument',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },
    deleteDocumentReminders: async (documentId: string) => {
        try {
            return await prisma.documentCommand.deleteMany({
                where: {
                    documentId,
                    body: {
                        path: ['kind'],
                        equals: 'remind',
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025':
                        throw AppError.notFound(
                            'REMINDER_NOT_FOUND',
                            'Reminder not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'deleteDocumentReminders',
                                },
                            }
                        );
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'deleteDocumentReminders',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to delete document reminders',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'deleteDocumentReminders',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: documentId,
                            operation: 'deleteDocumentReminders',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },
    updateToDone: async (reminderId: string) => {
        try {
            const command = await prisma.documentCommand.findUnique({
                where: { id: reminderId },
            });
            if (!command) {
                throw AppError.notFound(
                    'REMINDER_NOT_FOUND',
                    'Reminder not found',
                    {
                        context: {
                            origin: 'database',
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: reminderId,
                            operation: 'updateToDone',
                        },
                    }
                );
            }
            const body = command.body as Record<string, unknown>;
            await prisma.documentCommand.update({
                where: { id: reminderId },
                data: {
                    body: {
                        ...body,
                        status: 'done',
                        dismissedAt: new Date().toISOString(),
                    },
                },
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025':
                        throw AppError.notFound(
                            'REMINDER_NOT_FOUND',
                            'Reminder not found',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: reminderId,
                                    operation: 'updateToDone',
                                },
                            }
                        );
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: reminderId,
                                    operation: 'updateToDone',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to update reminder to done',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: reminderId,
                                    operation: 'updateToDone',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: reminderId,
                            operation: 'updateToDone',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },

    async syncDocumentReminders({
        documentId,
        userId,
        reminders,
    }: {
        documentId: string;
        userId: string;
        reminders: RemindCommandPayloadType[];
    }) {
        try {
            await prisma.$transaction(async (tx) => {
                // Get existing reminder commands for this document
                const existing = await tx.documentCommand.findMany({
                    where: {
                        documentId,
                        body: {
                            path: ['kind'],
                            equals: 'remind',
                        },
                    },
                    select: { id: true, body: true },
                });

                // Map existing commands by their reminder ID (stable across syncs)
                const existingByReminderId = new Map<string, string>();
                for (const command of existing) {
                    // Prisma query already filters for kind='remind', so we can safely cast
                    const body = command.body as RemindCommandPayloadType & {
                        id?: string;
                    };
                    const reminderId =
                        body.id && body.id.length > 0 ? body.id : command.id;
                    existingByReminderId.set(reminderId, command.id);
                }

                const seen = new Set<string>();
                const ops: Prisma.PrismaPromise<unknown>[] = [];

                // Create or update reminders from content
                for (const reminder of reminders) {
                    // Require ID from frontend - no fallback generation
                    if (!reminder.id || reminder.id.trim().length === 0) {
                        throw new Error(
                            'Reminder ID is required but was missing from frontend'
                        );
                    }
                    const reminderId = reminder.id;
                    seen.add(reminderId);

                    const payload: RemindCommandPayloadType & { id: string } = {
                        ...reminder,
                        id: reminderId,
                    };

                    const existingCommandId =
                        existingByReminderId.get(reminderId);
                    if (existingCommandId) {
                        // Update existing reminder
                        ops.push(
                            tx.documentCommand.update({
                                where: { id: existingCommandId },
                                data: { body: payload },
                            })
                        );
                    } else {
                        // Create new reminder
                        ops.push(
                            tx.documentCommand.create({
                                data: {
                                    documentId,
                                    userId,
                                    body: payload,
                                },
                            })
                        );
                    }
                }

                // Delete reminders that are no longer in the content
                for (const [reminderId, commandId] of existingByReminderId) {
                    if (!seen.has(reminderId)) {
                        ops.push(
                            tx.documentCommand.delete({
                                where: { id: commandId },
                            })
                        );
                    }
                }

                if (ops.length > 0) {
                    await Promise.all(ops);
                }
            });
        } catch (error) {
            if (error instanceof Prisma.PrismaClientKnownRequestError) {
                switch (error.code) {
                    case 'P2025':
                        throw AppError.notFound(
                            'REMINDER_SYNC_NOT_FOUND',
                            'Reminder not found during sync',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'syncDocumentReminders',
                                },
                            }
                        );
                    case 'P1001':
                    case 'P1002':
                        throw AppError.transient(
                            'DB_CONNECTION_FAILED',
                            'Database connection failed',
                            {
                                retryAfterMs: 5000,
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'syncDocumentReminders',
                                    metadata: { prismaCode: error.code },
                                },
                            }
                        );
                    default:
                        throw AppError.internal(
                            'DB_OPERATION_FAILED',
                            'Failed to sync document reminders',
                            {
                                context: {
                                    origin: 'database',
                                    domain: 'documentCommands',
                                    resource: 'DocumentCommand',
                                    resourceId: documentId,
                                    operation: 'syncDocumentReminders',
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
                            domain: 'documentCommands',
                            resource: 'DocumentCommand',
                            resourceId: documentId,
                            operation: 'syncDocumentReminders',
                            metadata: { message: error.message },
                        },
                    }
                );
            }
            throw error;
        }
    },
};
