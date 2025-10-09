import { z } from 'zod';

// universal id type
export const Id = z.string().min(1).meta({
    description: 'A unique identifier string',
    example: 'abc123',
});

// for server managed time
export const IsoDate = z.preprocess(
    (value) => (value instanceof Date ? value.toISOString() : value),
    z.iso.datetime({ offset: true, local: true })
);

// universal pagination
export const Pagination = z.object({
    // page number
    page: z.number().int().min(1).default(1).meta({
        description: 'Page number, starting from 1',
        example: 1,
    }),

    // items per page
    pageSize: z.number().int().min(1).max(100).default(10).meta({
        description: 'Number of items per page, max 100',
        example: 10,
    }),
});

// standard API error response
export const ApiError = z.object({
    error: z.string().meta({
        description: 'Error message',
        example: 'Bad Request',
    }),
    code: z.string().optional().meta({
        description: 'API Error format',
        example: 'VALIDATION_ERROR',
    }),
});
