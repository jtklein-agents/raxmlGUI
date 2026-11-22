// PROTOTYPE for wayfinder ticket #328. Throwaway: never merged, not wired into `yarn lint`.
// Stack from #326 (ESLint 10, @eslint/js + typescript-eslint recommended and stylistic, import-x,
// react-hooks, lodash) and formatting from #327 (@stylistic). Run it with prototype/run-eslint10.sh.
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import stylistic from '@stylistic/eslint-plugin';
import { importX, createNodeResolver } from 'eslint-plugin-import-x';
import reactHooks from 'eslint-plugin-react-hooks';
import lodash from 'eslint-plugin-lodash';
import globals from 'globals';

const TS = [ 'src/**/*.{ts,tsx}' ];

export default tseslint.config(
  { ignores: [ 'build/', 'dist/', 'out/', 'docs/', 'node_modules/' ] },

  // Base: correctness only, no layout.
  js.configs.recommended,
  tseslint.configs.recommended,
  tseslint.configs.stylistic,

  // Per-process globals. typescript-eslint turns `no-undef` off for TypeScript, so today these
  // only bind for the two JavaScript config files; the blocks keep the boundaries explicit.
  { files: [ 'src/main/**' ], languageOptions: { globals: globals.node } },
  { files: [ 'src/preload/**', 'src/preload-proofs/**' ], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: [ 'src/app/**', 'src/index.tsx', 'src/registerServiceWorker.ts' ], languageOptions: { globals: globals.browser } },
  { files: [ 'src/**/*.test.{ts,tsx}', 'src/test/**' ], languageOptions: { globals: { ...globals.node, ...globals.browser } } },
  { files: [ 'electron.vite.config.js', 'vitest.config.mjs', 'eslint.config.*' ], languageOptions: { globals: globals.node } },

  // The repo's own style, on every linted file.
  {
    plugins: { '@stylistic': stylistic, 'import-x': importX, lodash },
    settings: {
      // Without the TypeScript extensions `import-x/no-cycle` resolves nothing and passes silently.
      ...importX.flatConfigs.typescript.settings,
      'import-x/resolver-next': [ createNodeResolver( { extensions: [ '.ts', '.tsx', '.js', '.mjs', '.json' ] } ) ],
    },
    rules: {
      'lodash/import-scope': 'error',
      'import-x/no-cycle': 'error',
      'prefer-destructuring': [ 'error', { object: true, array: false } ],
      'no-warning-comments': [ 'error', { terms: [ 'shortcut:' ], location: 'anywhere' } ],
      '@stylistic/indent': [ 'error', 2, { SwitchCase: 1 } ],
      '@stylistic/comma-dangle': [ 'error', 'always-multiline' ],
      '@stylistic/space-in-parens': [ 'error', 'always' ],
      '@stylistic/multiline-ternary': [ 'error', 'always' ],
      // Candidates from #327: measured here, kept or dropped in #329.
      '@stylistic/semi': [ 'error', 'always' ],
      '@stylistic/quotes': [ 'error', 'single', { avoidEscape: true } ],
    },
  },

  // Page: hooks rules (the only React rules kept).
  { files: [ 'src/**/*.{ts,tsx}' ], ...reactHooks.configs.flat.recommended },

  // TypeScript style carried over from .eslintrc.cjs.
  {
    files: TS,
    rules: {
      '@typescript-eslint/consistent-type-imports': [ 'error', { fixStyle: 'separate-type-imports', prefer: 'type-imports' } ],
      '@typescript-eslint/consistent-type-definitions': [ 'error', 'interface' ],
      '@typescript-eslint/array-type': [ 'error', { default: 'array' } ],
      '@typescript-eslint/no-explicit-any': 'error',
      'import-x/consistent-type-specifier-style': [ 'error', 'prefer-top-level' ],
      '@typescript-eslint/no-unused-vars': [ 'error', {
        vars: 'all',
        args: 'after-used',
        argsIgnorePattern: '^_',
        varsIgnorePattern: '^_',
        ignoreRestSiblings: true,
        caughtErrors: 'all',
        caughtErrorsIgnorePattern: '^_',
      } ],
      '@typescript-eslint/explicit-module-boundary-types': 'error',
      'no-restricted-syntax': [
        'error',
        {
          selector: 'CatchClause[param][param.typeAnnotation=undefined]',
          message: 'Annotate catch bindings (use unknown).',
        },
        {
          selector: 'CatchClause BinaryExpression[operator="instanceof"][right.name="Error"]',
          message: 'Read (error as Error).message; jsdom Error is a different realm from Node throws.',
        },
      ],
    },
  },
);
