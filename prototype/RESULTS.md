# Draft flat config: results (PROTOTYPE, ticket #328)

Throwaway. `eslint.config.prototype.mjs` is the draft; `prototype/run-eslint10.sh <scratch-dir>` runs it.
Measured at `origin/master` acd4e44 on the `yarn lint` file set (156 files), Node v22.18.0.
Versions: eslint 10.15.0, @eslint/js 10.0.1, typescript-eslint 8.73.0, eslint-plugin-import-x 4.18.1,
eslint-plugin-react-hooks 7.1.1, eslint-plugin-lodash 8.1.0, @stylistic/eslint-plugin 6.0.1.

## Reports per rule (166 total, 50 autofixable)

| Rule | Reports | Autofixable | In test files | Files |
| --- | --- | --- | --- | --- |
| `@typescript-eslint/no-empty-function` | 94 | 0 | 90 | 36 |
| `@stylistic/indent` | 22 | 22 | 0 | 6 |
| `@stylistic/quotes` | 20 | 20 | 0 | 10 |
| `no-case-declarations` | 6 | 0 | 0 | `src/app/store/Run.ts` |
| `no-useless-assignment` | 5 | 0 | 0 | 4 |
| `@typescript-eslint/class-literal-property-style` | 4 | 0 | 0 | `src/app/store/PartOptions.ts`, `src/app/store/Run.ts` |
| `@typescript-eslint/prefer-for-of` | 4 | 0 | 0 | 4 |
| `prefer-const` | 3 | 3 | 0 | `src/app/store/Alignment.ts`, `src/main/startRun.ts` |
| `@typescript-eslint/no-unsafe-declaration-merging` | 2 | 0 | 0 | `src/app/store/Alignment.ts` |
| `@typescript-eslint/no-inferrable-types` | 2 | 2 | 0 | `src/app/store/Run.ts` |
| `@typescript-eslint/consistent-indexed-object-style` | 1 | 1 | 0 | `src/common/utils.ts` |
| `@typescript-eslint/consistent-generic-constructors` | 1 | 1 | 0 | `src/main/appStore.ts` |
| `no-empty` | 1 | 0 | 0 | `src/main/modelSelection.ts` |
| `@typescript-eslint/no-require-imports` | 1 | 0 | 1 | `src/pack.test.ts` |

Rules with zero reports include `@stylistic/semi`, `import-x/no-cycle`, `lodash/import-scope`, every
`react-hooks/*` rule (16 are on, including the React Compiler rules of plugin v7) and every custom rule
carried over from `.eslintrc.cjs`.

## Proofs

A two-file probe under `src/app` (a cycle, a hook called in a non-hook function, a missing semicolon):

- Draft config, ESLint 10: `import-x/no-cycle` reported on both files, `react-hooks/rules-of-hooks` and `@stylistic/semi` reported.
- Today's config, ESLint 8.57: only `react-hooks/rules-of-hooks` reported. **`import/no-cycle` did not fire on the `.ts` cycle**, so today's rule checks nothing on this tree.
- With the rule working, the real tree has zero cycles.

## Other facts

- Parser: typescript-eslint's parser handles every file, including `electron.vite.config.js` and `vitest.config.mjs`. No Babel parser is needed.
- Wall time: draft on ESLint 10 about 3.0 s; today's `eslint` run about 4.8 s (same machine, one run each).
- No "rule not found" or unused-disable reports: the tree's existing disable comments are compatible.
