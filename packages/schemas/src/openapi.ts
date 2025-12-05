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
    favoriteDocumentResponseSchema,
    unfavoriteDocumentResponseSchema,
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
import {
    AuthPayload,
    AuthResponse,
    registrationPayload,
    OAuthSignInPayload,
    OAuthSignInResponse,
} from './auth.js';
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
import {
    IndexingStatusQuerySchema,
    IndexingStatusResponseSchema,
} from './admin.js';
import {
    RecentSearchesQuery,
    RecentSearchesResponse,
    TopQueriesQuery,
    TopQueriesResponse,
    SearchAnalyticsQuery,
    SearchAnalyticsResponse,
    VolumeTimeSeriesQuery,
    VolumeTimeSeriesResponse,
    SearchAnalyticsDetailQuery,
    SearchAnalyticsDetailResponse,
} from './searchAnalytics.js';

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
                                schema: registrationPayload,
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
            '/v1/auth/oauth/sign-in': {
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: OAuthSignInPayload,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'OAuth sign-in succeeded',
                            content: {
                                'application/json': {
                                    schema: OAuthSignInResponse,
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
            '/v1/documents/{id}/favorite': {
                post: {
                    responses: {
                        200: {
                            description: 'Document favorited',
                            content: {
                                'application/json': {
                                    schema: favoriteDocumentResponseSchema,
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
            '/v1/documents/{id}/unfavorite': {
                post: {
                    responses: {
                        200: {
                            description: 'Document unfavorited',
                            content: {
                                'application/json': {
                                    schema: unfavoriteDocumentResponseSchema,
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

            // Search Analytics routes
            '/v1/search-analytics/recent': {
                get: {
                    summary: 'Get recent unique searches for current user',
                    description:
                        'Returns recent unique search queries for the authenticated user. Used by Quick Search card to show search history.',
                    requestParams: { query: RecentSearchesQuery },
                    responses: {
                        200: {
                            description:
                                'OK - Recent searches for current user',
                            content: {
                                'application/json': {
                                    schema: RecentSearchesResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant or validation error',
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
            '/v1/search-analytics/top-queries': {
                get: {
                    summary: 'Get most popular search queries',
                    description:
                        'Returns the most frequently searched queries across the workspace. Used by Search Intelligence card for analytics.',
                    requestParams: { query: TopQueriesQuery },
                    responses: {
                        200: {
                            description: 'OK - Top search queries with counts',
                            content: {
                                'application/json': {
                                    schema: TopQueriesResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant or validation error',
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
            '/v1/search-analytics/metrics': {
                get: {
                    summary:
                        'Get search analytics metrics with optional comparison',
                    description:
                        'Returns core search metrics including total searches, success rate, latency stats, and search type breakdown. Optionally includes trend comparison with previous period.',
                    requestParams: { query: SearchAnalyticsQuery },
                    responses: {
                        200: {
                            description:
                                'OK - Search analytics metrics with optional trends',
                            content: {
                                'application/json': {
                                    schema: SearchAnalyticsResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant or validation error',
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
            '/v1/search-analytics/volume': {
                get: {
                    summary: 'Get search volume time series data',
                    description:
                        'Returns search volume aggregated by hour or day for charting search activity over time.',
                    requestParams: { query: VolumeTimeSeriesQuery },
                    responses: {
                        200: {
                            description:
                                'OK - Time series data for search volume',
                            content: {
                                'application/json': {
                                    schema: VolumeTimeSeriesResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant or validation error',
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
            '/v1/search-analytics/detail': {
                get: {
                    summary:
                        'Get comprehensive search analytics with optional sections',
                    description:
                        'Returns detailed search analytics including core metrics and optionally: performance by search type, user behavior stats, and response time distribution. Used for detailed analytics dashboards.',
                    requestParams: { query: SearchAnalyticsDetailQuery },
                    responses: {
                        200: {
                            description:
                                'OK - Comprehensive search analytics data',
                            content: {
                                'application/json': {
                                    schema: SearchAnalyticsDetailResponse,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant or validation error',
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

            // Admin routes
            '/v1/admin/indexing': {
                get: {
                    summary:
                        'Get indexing status with stats, worker health, problems, and optional recent jobs',
                    description:
                        'Returns comprehensive indexing status for the current workspace. Use includeRecent for recently indexed documents and includeRecentJobs for job history across all documents.',
                    requestParams: { query: IndexingStatusQuerySchema },
                    responses: {
                        200: {
                            description:
                                'OK - Indexing status for current workspace',
                            content: {
                                'application/json': {
                                    schema: IndexingStatusResponseSchema,
                                },
                            },
                        },
                        400: {
                            description:
                                'Bad Request - No active tenant selected',
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
                                'Forbidden - Requires admin/owner role',
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
        },
    });
}
