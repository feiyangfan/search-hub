import { writeFileSync, mkdirSync } from 'node:fs';
import { buildOpenApi } from '@search-hub/schemas';
import { env } from '../src/config/env.js';

/**
 * PUBLIC_BASE_URL is for the server URL that appears in the spec.
 * In dev we default to http://localhost:3000 (your API port).
 */
const base = env.BASE_URL ?? 'http://localhost:3000';

const doc = buildOpenApi(base);

mkdirSync('openapi', { recursive: true });
writeFileSync('openapi/openapi.json', JSON.stringify(doc, null, 2));
console.log(
    `[api/script/generate-openapi] wrote apps/api/openapi/openapi.json with server=${base}`
);
