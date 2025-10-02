import { defineConfig } from 'vitest/config';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const rootDir = dirname(fileURLToPath(import.meta.url));

export default defineConfig({
    root: rootDir,
    test: {
        name: 'API unit tests',
        environment: 'node',
        setupFiles: ['./test/setup.ts'],
        coverage: {
            provider: 'v8',
            reporter: ['text', 'lcov'],
        },
    },
    resolve: {
        alias: {
            // Allows absolute imports like "@/routes" later if you adopt them
            '@': resolve(rootDir, 'src'),
        },
    },
});
