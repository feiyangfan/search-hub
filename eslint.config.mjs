// @ts-check
import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettierConfig from 'eslint-config-prettier';
import { defineConfig } from 'eslint/config';

export default defineConfig(
    eslint.configs.recommended,
    tseslint.configs.recommendedTypeChecked,
    {
        languageOptions: {
            parserOptions: {
                projectService: true,
                tsconfigRootDir: import.meta.dirname,
            },
        },
    },
    tseslint.configs.strict,
    tseslint.configs.stylistic,
    prettierConfig,
    {
        ignores: [
            'dist/',
            '**/dist/**',
            'node_modules/',
            'eslint.config.mjs',
            '**/coverage/**',
        ],
    }
);
