import { Router } from 'express';
import { AuthenticatedRequest } from '../middleware/authMiddleware.js';
import { AppError } from '@search-hub/schemas';
import { createDocumentService } from '../services/documentService.js';

const router = Router();
const documentService = createDocumentService();

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

        const reminders = await documentService.listTenantReminders({
            userId,
            tenantId,
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

        res.json({ reminders: pendingReminders });
    } catch (error) {
        next(error);
    }
});

/**
 * GET /v1/reminders/document/:documentId
 * Returns all reminders for a specific document
 */
router.get('/document/:documentId', async (req, res, next) => {
    try {
        const authReq = req as AuthenticatedRequest;
        const { userId } = authReq.session;
        const tenantId = authReq.session?.currentTenantId;
        const { documentId } = req.params;

        if (!tenantId) {
            throw AppError.validation(
                'NO_ACTIVE_TENANT',
                'No active tenant selected.',
                {
                    context: {
                        origin: 'server',
                        domain: 'reminder',
                        operation: 'list_document_reminders',
                    },
                }
            );
        }

        const reminders = await documentService.listDocumentReminders(
            documentId,
            { userId, tenantId }
        );

        const reminderStatuses = reminders.map((cmd) => {
            const body = cmd.body as {
                kind: string;
                status?: string;
                whenText?: string;
                whenISO?: string;
                id?: string;
            };
            return {
                id: cmd.id,
                reminderId: body.id,
                status: body.status ?? 'scheduled',
                whenISO: body.whenISO,
                whenText: body.whenText,
            };
        });

        res.json({ reminders: reminderStatuses });
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

        await documentService.dismissReminder(reminderId, {
            userId,
            tenantId,
        });

        res.json({ success: true });
    } catch (error) {
        next(error);
    }
});

export default router;
