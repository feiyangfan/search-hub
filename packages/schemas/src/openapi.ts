import { createDocument } from 'zod-openapi';
import type { oas31 } from 'zod-openapi';

type OpenApiDocument = oas31.OpenAPIObject;
import { ApiError } from './errors.js';
import {
    CreateDocumentRequest,
    CreateDocumentResponse,
    GetDocumentListParams,
    GetDocumentListResponse,
    GetDocumentDetailsResponse,
    UpdateDocumentTitlePayload,
    UpdateDocumentTitleResponse,
    UpdateDocumentContentPayload,
    UpdateDocumentContentResponse,
    ReindexDocumentResponse,
} from './document.js';
import { SearchQuery, SearchResponse } from './search.js';
import {
    CreateTenantPayload,
    CreateTenantResponse,
    DeleteTenantPayload,
    TenantListResponse,
    ActiveTenantPayload,
} from './tenant.js';
import { AuthPayload, AuthResponse } from './auth.js';

/**
 * OpenAPI 3.0 for Zod schemas
 */
export function buildOpenApi(
    baseUrl = 'http://localhost:3000'
): OpenApiDocument {
    return createDocument({
        openapi: '3.0.3',
        info: { title: 'Search Hub API', version: '0.1.0' },
        servers: [{ url: baseUrl }],
        paths: {
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

            '/v1/documents': {
                get: {
                    requestParams: { query: GetDocumentListParams },
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: GetDocumentListResponse,
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
                                schema: CreateDocumentRequest,
                            },
                        },
                    },
                    responses: {
                        202: {
                            description: 'Queued',
                            content: {
                                'application/json': {
                                    schema: CreateDocumentResponse,
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
                                    schema: GetDocumentDetailsResponse,
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
                                schema: UpdateDocumentTitlePayload,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Document title updated',
                            content: {
                                'application/json': {
                                    schema: UpdateDocumentTitleResponse,
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
                                schema: UpdateDocumentContentPayload,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'Document content updated',
                            content: {
                                'application/json': {
                                    schema: UpdateDocumentContentResponse,
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
                                    schema: ReindexDocumentResponse,
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
        },
    });
}
