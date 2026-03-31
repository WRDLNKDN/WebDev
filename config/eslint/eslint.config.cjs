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
const jsxA11y = require('eslint-plugin-jsx-a11y');

const allPlugins = {
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  'react-refresh': reactRefreshPlugin,
  prettier: prettierPlugin,
  'jsx-a11y': jsxA11y,
};

module.exports = [
  // 1. GLOBAL IGNORES (Environment Optimization)
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
      // jscpd HTML report (vendor JS/CSS, not app source)
      '**/jscpd-report/**',
      '**/jscpd-full/**',
    ],
  },

  // 2. BASE RULES
  js.configs.recommended,
  ...tseslint.configs.recommended,

  // 2b. Node API (plain .js): fetch, Buffer, timers
  {
    files: ['backend/**/*.js'],
    languageOptions: {
      globals: globals.node,
    },
  },

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
    // Explicit version: ESLint 10 removes context.getFilename(); "detect" breaks in flat config
    // with eslint-plugin-react until the plugin catches up (see resolveBasedir in version.js).
    settings: {
      react: { version: '19.2' },
    },
    rules: {
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      // Do not spread reactHooksPlugin.configs.recommended: v7 bundles React Compiler
      // rules (refs, set-state-in-effect, static-components, etc.) that flag most
      // existing MUI/React patterns. Keep classic hooks lint only.
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'warn',
      ...jsxA11y.configs.recommended.rules,

      // Formatting Firewall
      'prettier/prettier': 'error',

      // Component Architecture
      'react/function-component-definition': [
        'error',
        {
          namedComponents: 'arrow-function',
          unnamedComponents: 'arrow-function',
        },
      ],
      'react-refresh/only-export-components': 'off',

      // Logic Purity overrides
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',

      // 🔒 Tightened: any is now an error
      '@typescript-eslint/no-explicit-any': 'error',

      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_' },
      ],

      // --- MUI & SEMANTIC INTEGRITY (The Prophet's Audit) ---
      // We block generic 'button' and 'a' tags to enforce MUI Button/Link for A11y
      'no-restricted-syntax': [
        'error',
        {
          selector: "JSXOpeningElement[name.name='button']",
          message:
            'Use MUI <Button /> instead to ensure WCAG 2.2 / Section 508 compliance.',
        },
        {
          selector: "JSXOpeningElement[name.name='a']",
          message:
            'Use MUI <Link /> or Next/Vite routing components to maintain system integrity.',
        },
      ],

      // Accessibility Hardening (WCAG 2.2 AA)
      'jsx-a11y/anchor-is-valid': 'error',
      'jsx-a11y/alt-text': 'error',
      'jsx-a11y/aria-props': 'error',
      'jsx-a11y/role-has-required-aria-props': 'error',
    },
  },

  // 4. VITEST TESTS (Unit + RLS tests)
  // Apply Vitest globals and explicitly DISABLE Playwright rules in this folder.
  {
    files: ['tests/**/*.{test,spec}.{ts,tsx,js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        ...globals.es2021,

        // Vitest globals (so eslint doesn't complain)
        describe: 'readonly',
        it: 'readonly',
        test: 'readonly',
        expect: 'readonly',
        beforeAll: 'readonly',
        beforeEach: 'readonly',
        afterAll: 'readonly',
        afterEach: 'readonly',
        vi: 'readonly',
      },
    },
    rules: {
      // Make sure Playwright rules never fire on Vitest files
      'playwright/no-conditional-in-test': 'off',
      'playwright/no-conditional-expect': 'off',
      'playwright/no-wait-for-timeout': 'off',
    },
  },

  // 5. PLAYWRIGHT Configuration (E2E only)
  {
    files: ['e2e/**/*.{spec,test}.{ts,tsx,js,jsx}'],
    // @ts-ignore
    ...playwright.configs['flat/recommended'],
    rules: {
      // @ts-ignore
      ...playwright.configs['flat/recommended'].rules,
      'playwright/no-wait-for-timeout': 'error', // Upgraded to error for high-integrity
    },
  },

  // 6. Supabase Edge Functions (Deno; not React)
  {
    files: ['supabase/functions/**/*.ts'],
    languageOptions: {
      parser: tseslint.parser,
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        Deno: 'readonly',
      },
    },
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      'no-unused-vars': 'off',
    },
  },

  // 7. PRETTIER (The Final Firewall)
  prettierConfig,
];
