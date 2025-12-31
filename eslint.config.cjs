// @ts-check
// This is the definitive ESLint Flat Config file (CJS format) for React 19 / TypeScript / Vite.

const globals = require('globals');
const js = require('@eslint/js');
const tseslint = require('typescript-eslint');
const reactPlugin = require('eslint-plugin-react');
const reactHooksPlugin = require('eslint-plugin-react-hooks');
const reactRefreshPlugin = require('eslint-plugin-react-refresh');
const prettierPlugin = require('eslint-plugin-prettier'); // <-- NEW PLUGIN
const prettierConfig = require('eslint-config-prettier'); // <-- NEW CONFIG

// 1. Define the complete plugins object for the custom configuration blocks
const allPlugins = {
  react: reactPlugin,
  'react-hooks': reactHooksPlugin,
  'react-refresh': reactRefreshPlugin,
  prettier: prettierPlugin, // <-- ADD PRETTIER PLUGIN
};

// --- Final Configuration Array ---
module.exports = [
  // 1. GLOBAL IGNORES
  {
    ignores: ['dist', 'node_modules', '*.cjs', '*.mjs', '.gitattributes'],
  },

  // 2. BASE ESLINT RULES
  js.configs.recommended,

  // 3. BASE TYPESCRIPT RULES
  ...tseslint.configs.recommended,

  // 4. REACT & HOOKS Configuration (Includes the necessary parser setup)
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
      // --- Rule Spreading ---
      ...reactPlugin.configs.recommended.rules,
      ...reactPlugin.configs['jsx-runtime'].rules,
      ...reactHooksPlugin.configs.recommended.rules,

      // We are adding the 'prettier/prettier' rule here to report formatting errors
      'prettier/prettier': 'error',

      // --- Custom Rules ---
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

      // TypeScript and PropType relaxations
      'react/prop-types': 'off',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-explicit-any': 'warn',
    },
  },

  // 5. PRETTIER CONFIGURATION (MUST BE LAST!)
  // This turns off all ESLint rules that conflict with Prettier.
  prettierConfig,
];
