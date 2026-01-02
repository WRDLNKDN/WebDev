// @ts-check
// This is the definitive ESLint Flat Config file (CJS format) for React 19 / TypeScript / Vite.

const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactRefreshPlugin = require('eslint-plugin-react-refresh');
const prettierPlugin = require('eslint-plugin-prettier');
const prettierConfig = require('eslint-config-prettier');
const playwright = require('eslint-plugin-playwright');

const allPlugins = {
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  'react-refresh': reactRefreshPlugin,
  prettier: prettierPlugin,
};

module.exports = [
  // 1. GLOBAL IGNORES (Environment Optimization)
  // Must be a standalone object with ONLY the ignores key for maximum logic purity
  {
    ignores: [
      'src/types/supabase.ts', // Ignore machine-generated code
      '**/dist/**',
      '**/node_modules/**',
      '**/.eslintcache',
      '**/*.cjs',
      '**/*.mjs',
      '.gitattributes',
      '**/test-results/**',
      '**/playwright-report/**',
      '**/blob-report/**',
    ],
  },

  // 2. BASE RULES
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 3. REACT & HOOKS Configuration
  {
    files: ['**/*.{ts,tsx}'],
    plugins: allPlugins,
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2020,
      globals: globals.browser,
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,
      'prettier/prettier': 'error',
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 4. PLAYWRIGHT Configuration (The "Verification" Layer)
  {
    files: ['tests/**/*.{spec,test}.{ts,js}'],
    // @ts-ignore - Bypass the property check if the compiler is blind to the CJS export
    ...playwright.configs['flat/recommended'],
    rules: {
      // @ts-ignore
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'warn',
    },
  },

  // 5. PRETTIER (The Final Firewall)
  prettierConfig,
];
