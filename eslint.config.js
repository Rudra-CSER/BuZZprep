import js from '@eslint/js';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import globals from 'globals';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/dev-dist/**',
      '**/node_modules/**',
      '**/coverage/**',
      'apps/web/public/**',
      // Local-only folders (git-ignored): data exports and safety copies.
      'data/**',
      'backups/**',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    rules: {
      '@typescript-eslint/no-unused-vars': [
        'warn',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', destructuredArrayIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'warn',
      'no-console': 'warn',
    },
  },
  {
    files: ['apps/web/**/*.{ts,tsx}'],
    languageOptions: { globals: { ...globals.browser } },
    plugins: { 'react-hooks': reactHooks, 'react-refresh': reactRefresh },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-refresh/only-export-components': ['warn', { allowConstantExport: true }],
    },
  },
  {
    files: ['apps/web/src/sw.ts'],
    languageOptions: { globals: { ...globals.serviceworker } },
  },
  {
    files: [
      'apps/server/**/*.ts',
      'scripts/**/*.{js,mjs}',
      'apps/server/scripts/**/*.{ts,mjs}',
      '*.config.{js,ts}',
    ],
    languageOptions: { globals: { ...globals.node } },
  },
  // Structure guards (see docs/ARCHITECTURE.md › Code organisation).
  {
    files: ['apps/server/src/modules/**/*.routes.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          paths: [
            {
              name: 'mongoose',
              message: 'Keep routes thin: database work belongs in the module’s service.',
            },
          ],
          patterns: [
            {
              group: ['**/db/models', '**/db/models/*'],
              message: 'Keep routes thin: database work belongs in the module’s service.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['apps/web/src/{api,components,lib}/**/*.{ts,tsx}'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['@/features/*', '**/features/*'],
              message:
                'Shared code must not depend on a feature; move the shared part out of the feature instead.',
            },
          ],
        },
      ],
    },
  },
  {
    files: ['**/test/**/*.ts', 'scripts/**', 'apps/server/scripts/**'],
    rules: { 'no-console': 'off', '@typescript-eslint/no-explicit-any': 'off' },
  },
);
