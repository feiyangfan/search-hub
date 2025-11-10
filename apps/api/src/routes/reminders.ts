import { Router } from 'express';
import { prisma } from '@search-hub/db';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { logger } from '@search-hub/logger';
import { AppError } from '@search-hub/schemas';

const router = Router();

/**
 * GET /v1/reminders/pending
 * Returns all pending and notified reminders for the current user
 */
router.get('/pending', async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId } = authReq.session;
        const tenantId = authReq.session?.currentTenantId;

        if (!tenantId) {
            throw AppError.validation(
                'NO_ACTIVE_TENANT',
                'No active tenant selected.',
                {
                    context: {
                        origin: 'server',
                        domain: 'reminder',
                        operation: 'list',
                    },
                }
            );
        }
        const reminders = await prisma.documentCommand.findMany({
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

        // Filter by status in memory (JsonFilter doesn't support nested status check easily)
        const pendingReminders = reminders
            .filter((cmd) => {
                const body = cmd.body as {
                    kind: string;
                    status?: string;
                    whenText?: string;
                    whenISO?: string;
                };
                return (
                    body.status === 'scheduled' || body.status === 'notified'
                );
            })
            .map((cmd) => ({
                id: cmd.id,
                documentId: cmd.documentId,
                documentTitle: cmd.document.title,
                body: cmd.body,
                createdAt: cmd.createdAt,
            }));

        logger.info(
            { userId, tenantId, count: pendingReminders.length },
            'Fetched pending reminders'
        );

        res.json({ reminders: pendingReminders });
    } catch (error) {
        next(error);
    }
});

/**
 * PATCH /v1/reminders/:id/dismiss
 * Marks a reminder as done
 */
router.patch('/:id/dismiss', async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId } = authReq.session;
        const tenantId = authReq.session?.currentTenantId;
        const reminderId = req.params.id;

        if (!tenantId) {
            throw AppError.validation(
                'NO_ACTIVE_TENANT',
                'No active tenant selected.',
                {
                    context: {
                        origin: 'server',
                        domain: 'reminder',
                        operation: 'dismiss',
                    },
                }
            );
        }
        const command = await prisma.documentCommand.findUnique({
            where: { id: reminderId },
        });

        if (!command) {
            throw AppError.notFound('REMINDER_NOT_FOUND', 'Reminder not found');
        }

        if (command.userId !== userId) {
            throw AppError.authorization(
                'UNAUTHORIZED_REMINDER_ACCESS',
                'You do not have permission to dismiss this reminder',
                {
                    context: {
                        origin: 'server',
                        domain: 'reminder',
                        operation: 'dismiss',
                        resourceId: reminderId,
                    },
                }
            );
        }

        const body = command.body as {
            kind: string;
            status?: string;
            whenText?: string;
            whenISO?: string;
        };

        // Update status to 'done'
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

        logger.info(
            { reminderId, userId, tenantId },
            'Reminder marked as done'
        );

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
