import { createDocument } from 'zod-openapi';
import type { oas31 } from 'zod-openapi';

type OpenApiDocument = oas31.OpenAPIObject;
import { ApiError } from './common.js';
import { CreateDocumentRequest, CreateDocumentResponse } from './document.js';
import { SearchQuery, SearchResponse } from './search.js';
import { CreateTenantRequest, CreateTenantResponse } from './tenant.js';

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
                    },
                },
            },
            '/v1/tenants': {
                post: {
                    requestBody: {
                        required: true,
                        content: {
                            'application/json': {
                                schema: CreateTenantRequest,
                            },
                        },
                    },
                    responses: {
                        200: {
                            description: 'OK',
                            content: {
                                'application/json': {
                                    schema: CreateTenantResponse,
                                },
                            },
                        },
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
                    },
                },
            },
        },
    });
}
