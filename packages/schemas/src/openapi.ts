import { createDocument } from 'zod-openapi';
import type { oas31 } from 'zod-openapi';

type OpenApiDocument = oas31.OpenAPIObject;
import { ApiError } from './common.js';
import { CreateDocumentRequest, CreateDocumentResponse } from './document.js';
import { SearchQuery, SearchResponse } from './search.js';
import {
    CreateTenantPayload,
    CreateTenantResponse,
    DeleteTenantPayload,
    TenantListResponse,
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
                        409: {
                            description: 'Conflict: User already exists',
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
                    },
                },
            },
            '/v1/auth/sign-out': {
                post: {
                    responses: {
                        204: {
                            description: 'Signed out successfully',
                        },
                    },
                },
            },

            '/v1/documents': {
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
                            description: 'Bad Request',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description: 'Unauthorized',
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
                            description: 'Bad Request',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description: 'Unauthorized',
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
                            description: 'List tenants the current user belongs to',
                            content: {
                                'application/json': {
                                    schema: TenantListResponse,
                                },
                            },
                        },
                        401: {
                            description: 'Unauthorized',
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
                            description: 'Bad Request',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        401: {
                            description: 'Unauthorized',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        409: {
                            description: 'Conflict',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
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
                            description: 'Unauthorized',
                            content: {
                                'application/json': { schema: ApiError },
                            },
                        },
                        403: {
                            description: 'Forbidden',
                            content: {
                                'application/json': {
                                    schema: ApiError,
                                },
                            },
                        },
                    },
                },
            },
        },
    });
}
