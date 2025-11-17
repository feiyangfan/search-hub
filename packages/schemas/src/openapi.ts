import { z } from 'zod';
import { createDocument } from 'zod-openapi';
import type { oas31 } from 'zod-openapi';

type OpenApiDocument = oas31.OpenAPIObject;
import { ApiError } from './errors.js';
import {
    createDocumentRequestSchema,
    createDocumentResponseSchema,
    getDocumentListParamsSchema,
    getDocumentListResponseSchema,
    getDocumentDetailsResponseSchema,
    updateDocumentTitlePayloadSchema,
    updateDocumentTitleResponseSchema,
    updateDocumentContentPayloadSchema,
    updateDocumentContentResponseSchema,
    updateDocumentIconPayloadSchema,
    updateDocumentIconResponseSchema,
    reindexDocumentResponseSchema,
    getPendingRemindersResponseSchema,
    getDocumentRemindersResponseSchema,
    dismissReminderResponseSchema,
} from './document.js';
import { SearchQuery, SearchResponse } from './search.js';
import {
    CreateTenantPayload,
    CreateTenantResponse,
    DeleteTenantPayload,
    TenantListResponse,
    ActiveTenantPayload,
    GetTenantWithStatsResponseSchema,
} from './tenant.js';
import { Id } from './common.js';
import { AuthPayload, AuthResponse } from './auth.js';
import {
    addTagsToDocumentRequestSchema,
    addTagsToDocumentResponseSchema,
    getDocumentTagsResponseSchema,
    removeTagFromDocumentResponseSchema,
    createTagRequestSchema,
    createTagResponseSchema,
    updateTagRequestSchema,
    updateTagResponseSchema,
    listTagsQuerySchema,
    listTagsResponseSchema,
    getTagResponseSchema,
} from './tag.js';

/**
 * OpenAPI 3.0 for Zod schemas
 */
export function buildOpenApi(
    baseUrl = 'http://localhost:3000'
): OpenApiDocument {
    const tenantIdPathParams = z.object({
        tenantId: Id,
    });

    return createDocument({
        openapi: '3.0.3',
        info: { title: 'Search Hub API', version: '0.1.0' },
        servers: [{ url: baseUrl }],
        paths: {
            // Auth routes
            '/v1/auth/sign-up': {
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: AuthPayload,
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'User created',
                            content: {
                                'application/json': {
                                    schema: AuthResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - Validation error or user already exists',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                        500: {
                            description:
                                'Internal Server Error - Database or system error',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                    },
                },
            },
            '/v1/auth/sign-in': {
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: AuthPayload,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'User signed in',
                            content: {
                                'application/json': {
                                    schema: AuthResponse,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                        401: {
                            description: 'Unauthorized - Invalid credentials',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                    },
                },
            },
            '/v1/auth/sign-out': {
                post: {
                    responses: {
                        204: {
                            description: 'Signed out successfully',
                        },
                        401: {
                            description: 'Unauthorized - No active session',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                    },
                },
            },

            // Tenant routes
            '/v1/tenants': {
                get: {
                    responses: {
                        200: {
                            description:
                                'List tenants the current user belongs to',
                            content: {
                                'application/json': {
                                    schema: TenantListResponse,
                                },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: CreateTenantPayload,
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Created',
                            content: {
                                'application/json': {
                                    schema: CreateTenantResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - Validation error or tenant name exists',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                delete: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: DeleteTenantPayload,
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'Success',
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description:
                                'Forbidden - Not authorized to delete this tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tenant not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/tenants/active': {
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: ActiveTenantPayload,
                            },
                        },
                    },
                    responses: {
                        204: {
                            description: 'Success',
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description:
                                'Forbidden - User not member of tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tenant not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/tenants/{tenantId}/stats': {
                get: {
                    requestParams: {
                        path: tenantIdPathParams,
                    },
                    responses: {
                        200: {
                            description: 'Workspace stats and recent activity',
                            content: {
                                'application/json': {
                                    schema: GetTenantWithStatsResponseSchema,
                                },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description:
                                'Forbidden - User not member of tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tenant not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },

            // Document routes
            '/v1/documents': {
                get: {
                    requestParams: { query: getDocumentListParamsSchema },
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: getDocumentListResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Tenant access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: createDocumentRequestSchema,
                            },
                        },
                    },
                    responses: {
                        202: {
                            description: 'Queued',
                            content: {
                                'application/json': {
                                    schema: createDocumentResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Tenant access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}': {
                get: {
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: getDocumentDetailsResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                delete: {
                    responses: {
                        204: {
                            description:
                                'No Content - Document deleted successfully',
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description:
                                'Forbidden - Only owners/admins can delete documents',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/title': {
                patch: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: updateDocumentTitlePayloadSchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Document title updated',
                            content: {
                                'application/json': {
                                    schema: updateDocumentTitleResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/content': {
                patch: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: updateDocumentContentPayloadSchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Document content updated',
                            content: {
                                'application/json': {
                                    schema: updateDocumentContentResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/icon': {
                patch: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: updateDocumentIconPayloadSchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Document icon updated',
                            content: {
                                'application/json': {
                                    schema: updateDocumentIconResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/reindex': {
                post: {
                    responses: {
                        202: {
                            description:
                                'Accepted - Re-index job queued successfully',
                            content: {
                                'application/json': {
                                    schema: reindexDocumentResponseSchema,
                                },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/tags': {
                get: {
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: getDocumentTagsResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: addTagsToDocumentRequestSchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Tags added to document',
                            content: {
                                'application/json': {
                                    schema: addTagsToDocumentResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/documents/{id}/tags/{tagId}': {
                delete: {
                    responses: {
                        200: {
                            description: 'Tag removed from document',
                            content: {
                                'application/json': {
                                    schema: removeTagFromDocumentResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description:
                                'Not Found - Document or tag not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },

            // Tag routes
            '/v1/tags': {
                get: {
                    requestParams: { query: listTagsQuerySchema },
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: listTagsResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: createTagRequestSchema,
                            },
                        },
                    },
                    responses: {
                        201: {
                            description: 'Tag created',
                            content: {
                                'application/json': {
                                    schema: createTagResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        409: {
                            description: 'Conflict - Tag already exists',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/tags/{id}': {
                get: {
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: getTagResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tag does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                patch: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: updateTagRequestSchema,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Tag updated',
                            content: {
                                'application/json': {
                                    schema: updateTagResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tag does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        409: {
                            description: 'Conflict - Tag already exists',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
                delete: {
                    responses: {
                        204: {
                            description:
                                'No Content - Tag deleted successfully',
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Tag does not exist',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },

            // Reminder routes
            '/v1/reminders/pending': {
                get: {
                    responses: {
                        200: {
                            description: 'OK - Returns pending reminders',
                            content: {
                                'application/json': {
                                    schema: getPendingRemindersResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - No active tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/reminders/document/{documentId}': {
                get: {
                    requestParams: {
                        path: z.object({
                            documentId: Id,
                        }),
                    },
                    responses: {
                        200: {
                            description:
                                'OK - Returns reminders for a document',
                            content: {
                                'application/json': {
                                    schema: getDocumentRemindersResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - No active tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Document not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
            '/v1/reminders/{id}/dismiss': {
                patch: {
                    requestParams: {
                        path: z.object({
                            id: Id,
                        }),
                    },
                    responses: {
                        200: {
                            description: 'OK - Reminder marked as done',
                            content: {
                                'application/json': {
                                    schema: dismissReminderResponseSchema,
                                },
                            },
                        },
                        400: {
                            description: 'Bad Request - No active tenant',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description:
                                'Forbidden - Not authorized to dismiss this reminder',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        404: {
                            description: 'Not Found - Reminder not found',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },

            // Search routes
            '/v1/search': {
                get: {
                    requestParams: { query: SearchQuery },
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': { schema: SearchResponse },
                            },
                        },
                        400: {
                            description: 'Bad Request - Validation error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description:
                                'Unauthorized - Authentication required',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden - Tenant access denied',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        429: {
                            description:
                                'Too Many Requests - Rate limit exceeded',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        500: {
                            description: 'Internal Server Error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        502: {
                            description: 'Bad Gateway - AI service error',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                    },
                },
            },
        },
    });
}
