# What `eslint-config-react-app` 7.0.1 enforces in this repo

Research for #323 (map #321). Measured on `origin/master` at `acd4e44`, 2026-11-22.

## Answer in short

- `.eslintrc.cjs` extends `react-app` only, never `react-app/jest`. So **zero** `jest/*` and **zero** `testing-library/*` rules run; those two plugins are not even loaded.
- On a TypeScript file `react-app` supplies 114 active rules (of 128 active in total; the other 14 are the repo's own). On a JavaScript file it supplies 116 (of 124).
- Every file under `src` that ESLint sees is `.ts` or `.tsx` (154 files). The only linted JavaScript is `electron.vite.config.js` and `vitest.config.mjs`.
- `react-app` sets most rules to `warn`, but `yarn lint` runs with `--max-warnings 0`, so every active rule fails the check.
- Of the 114: 62 catch bugs, 26 are style, 17 are accessibility, 7 are dead weight here (Flow, webpack, AMD, PropTypes), 2 are helpers for `no-unused-vars`.
- Only 26 of the 114 are style rules, and none of them is a formatting rule the owner's own config relies on. The style the repo enforces (`indent`, `comma-dangle`, `space-in-parens`, `multiline-ternary`, type-import style) all comes from `.eslintrc.cjs` itself.

## Rule counts per plugin

Active (not `off`) rules that `react-app` contributes. "Kind" columns count the TypeScript column.

| Plugin | On for TS | On for JS | bug | style | a11y | legacy | helper |
|---|---|---|---|---|---|---|---|
| core | 67 | 76 | 46 | 20 | 0 | 1 | 0 |
| react | 14 | 14 | 10 | 1 | 0 | 1 | 2 |
| react-hooks | 2 | 2 | 2 | 0 | 0 | 0 | 0 |
| jsx-a11y | 17 | 17 | 0 | 0 | 17 | 0 | 0 |
| import | 4 | 4 | 0 | 2 | 0 | 2 | 0 |
| flowtype | 3 | 3 | 0 | 0 | 0 | 3 | 0 |
| @typescript-eslint | 7 | 0 | 4 | 3 | 0 | 0 | 0 |
| jest | 0 | 0 | | | | | |
| testing-library | 0 | 0 | | | | | |
| **total** | 114 | 116 | 62 | 26 | 17 | 7 | 2 |

The nine core rules that are on for JS but off for TS are the ones the `react-app` TypeScript override switches off: `default-case`, `no-dupe-class-members`, `no-undef`, and six that it swaps for a `@typescript-eslint/*` twin (`no-array-constructor`, `no-redeclare`, `no-use-before-define`, `no-unused-expressions`, `no-unused-vars`, `no-useless-constructor`). The seventh `@typescript-eslint` rule, `consistent-type-assertions`, has no core twin.

Two of the 114 are marked (*) in the tables: `react-app` names the rule, but `.eslintrc.cjs` replaces its value, so the repo keeps them whatever happens to `react-app`:

- `@typescript-eslint/no-unused-vars`: `react-app` sets `warn` with `args: none`; the repo sets `error` with `args: after-used` and the `^_` ignore patterns.
- `no-restricted-syntax`: `react-app` bans `WithStatement`; the repo's `src/**/*.{ts,tsx}` override replaces the list with its two `CatchClause` selectors. ESLint replaces rule options, it does not merge them, so the `with` ban is gone on `src` TypeScript (`no-with` still covers it).

## Bug-catching rules lost if `react-app` goes with no replacement

All 62 "bug" rules go, minus `@typescript-eslint/no-unused-vars` (the repo's own). They fall into four groups, by how likely a modern base config is to bring them back.

**1. React rules: nothing else in the repo covers these (12).**

- `react-hooks/rules-of-hooks` (error), `react-hooks/exhaustive-deps` (warn). Five files under `src` call hooks.
- `react/jsx-no-comment-textnodes`, `react/jsx-no-duplicate-props`, `react/jsx-no-target-blank`, `react/jsx-no-undef`, `react/no-danger-with-children`, `react/no-direct-mutation-state`, `react/no-is-mounted`, `react/no-typos`, `react/require-render-return`, `react/style-prop-object`. One file still has a class component, so the class-only rules (`no-direct-mutation-state`, `no-is-mounted`, `require-render-return`, `no-typos`) have one target. On `.tsx`, `tsc` already reports `jsx-no-undef` (ts 2304) and `jsx-no-duplicate-props` (ts 17001).

**2. Core rules outside `eslint:recommended` and not reported by `tsc` (17).** A base config built on `eslint:recommended` alone drops these:

`array-callback-return`, `eqeqeq` (smart), `no-caller`, `no-eval`, `no-extend-native`, `no-implied-eval`, `no-iterator`, `no-loop-func`, `no-new-func`, `no-new-wrappers`, `no-octal-escape`, `no-restricted-globals` (the `confusing-browser-globals` list: bare `name`, `event`, `status`, `open`, `close`, `length`, `location`, `history`, `top`, `parent`, `self`, `screen`, …), `no-script-url`, `no-self-compare`, `no-sequences`, `no-template-curly-in-string`, `no-throw-literal`.

**3. `@typescript-eslint` rules (3).** `no-unused-expressions` (error), `no-redeclare`, `no-use-before-define` (configured so loosely, with functions, classes, variables and typedefs all `false`, that it is close to a no-op).

**4. Core rules that `eslint:recommended` has (29 on TS; `no-undef` makes 30 on JS).** Any base config that includes `eslint:recommended` restores them. Eleven of them are also on the list typescript-eslint's `eslint-recommended` config switches off for TypeScript because `tsc` reports the same thing.

Two caveats on "`tsc` covers it" for this repo:

- `no-unreachable`: `tsc` reports unreachable code (ts 7027) as an error only when `allowUnreachableCode` is `false`. `tsconfig.json` does not set it, so here it is an editor hint, not a `tsc` failure. Today the ESLint rule is the only gate.
- `no-fallthrough`: `react-app` turns `default-case` off for TypeScript on the grounds that `noFallthroughCasesInSwitch` is better. `tsconfig.json` does not set that flag either (`strict` is `false`), so ESLint's `no-fallthrough` is the only gate.

## What can go without loss

- `flowtype/*` (3): the repo has no Flow. `require-valid-file-annotation` runs on every file and finds nothing.
- `import/no-webpack-loader-syntax`, `import/no-amd`, `no-restricted-properties` (`require.ensure`, `System.import`): webpack and AMD era; the build is electron-vite.
- `react/forbid-foreign-prop-types`: PropTypes era.
- `react/jsx-uses-react`: only needed for the classic JSX transform; `tsconfig.json` has `"jsx": "react-jsx"`.
- `react/jsx-uses-vars`: only needed so core `no-unused-vars` sees JSX usage. Verified: `eslint --rule 'react/jsx-uses-vars: off' --rule 'react/jsx-uses-react: off' "src/**/*.{ts,tsx}"` reports nothing, because `@typescript-eslint/no-unused-vars` resolves JSX references itself.
- Deprecated in ESLint 8.57 (formatting rules moved to `@stylistic`, or renamed): `dot-location`, `new-parens`, `no-whitespace-before-property`, `rest-spread-spacing`, `no-mixed-operators`, `no-new-object`. The repo's own `indent`, `comma-dangle`, `space-in-parens` and `multiline-ternary` are in the same deprecated set; that is the spec's problem, not `react-app`'s.

## Non-rule things `react-app` provides

Dropping it also removes these, and the flat config has to restate them:

- Parser: `@typescript-eslint/parser` for `**/*.ts?(x)` (with `ecmaFeatures.jsx`), `@babel/eslint-parser` with `babel-preset-react-app/prod` for everything else, which here means the two config files.
- `env`: `browser`, `commonjs`, `es6`, `jest`, `node`, for every file regardless of Electron process. `no-undef` is off for TypeScript, so these globals only matter for the two JavaScript config files.
- `settings.react.version: 'detect'`.
- Plugin registration for `import` and `@typescript-eslint`, which the repo's own rules (`import/no-cycle`, `import/consistent-type-specifier-style`, all `@typescript-eslint/*`) depend on. `.eslintrc.cjs` registers only `lodash`.
- `eslint-plugin-import`, `eslint-plugin-react`, `eslint-plugin-react-hooks`, `eslint-plugin-jsx-a11y`, `@babel/eslint-parser` are not in `package.json`; they are installed only as dependencies of `eslint-config-react-app`.

## Installed versions

| Package | Installed | `react-app` 7.0.1 asks for |
|---|---|---|
| eslint | 8.57.1 | peer `^8.0.0` |
| eslint-config-react-app | 7.0.1 | |
| @typescript-eslint/eslint-plugin, parser | 8.72.1 | `^5.5.0` (overridden by the `resolutions` pin in `package.json`) |
| eslint-plugin-react | 7.37.0 | `^7.27.1` |
| eslint-plugin-react-hooks | 4.6.2 | `^4.3.0` |
| eslint-plugin-jsx-a11y | 6.10.0 | `^6.5.1` |
| eslint-plugin-import | 2.30.0 | `^2.25.3` |
| eslint-plugin-flowtype | 8.0.3 | `^8.0.3` |
| eslint-plugin-jest | 25.7.0 (unused) | `^25.3.0` |
| eslint-plugin-testing-library | 5.11.1 (unused) | `^5.0.1` |
| @babel/eslint-parser | 7.25.1 | `^7.16.3` |
| eslint-plugin-lodash (repo's own) | 8.1.0 | |

## Rule by rule

Columns: severity on a TypeScript file (`src/app/index.tsx`) and on a JavaScript file (`electron.vite.config.js`); `-` means the rule is not configured there. Kind is this note's judgement: **bug** (flags code that is wrong or likely wrong), **style**, **a11y**, **legacy** (targets something the repo does not use), **helper**. For core rules the table also gives ESLint's own `meta.type`, whether the rule is in `eslint:recommended` of the installed `@eslint/js` 8.57.1, whether typescript-eslint's `eslint-recommended` lists it as reported by `tsc`, and whether ESLint 8.57.1 marks it deprecated. (*) = the repo's config replaces the value.

### core

| Rule | TS | JS | Kind | ESLint type | In `eslint:recommended` | tsc covers | Deprecated |
|---|---|---|---|---|---|---|---|
| `array-callback-return` | warn | warn | bug | problem |  |  |  |
| `default-case` | off | warn | bug | suggestion |  |  |  |
| `dot-location` | warn | warn | style | layout |  |  | yes |
| `eqeqeq` | warn | warn | bug | suggestion |  |  |  |
| `getter-return` | warn | warn | bug | problem | yes | yes |  |
| `new-parens` | warn | warn | style | layout |  |  | yes |
| `no-array-constructor` | off | warn | style | suggestion |  |  |  |
| `no-caller` | warn | warn | bug | suggestion |  |  |  |
| `no-cond-assign` | warn | warn | bug | problem | yes |  |  |
| `no-const-assign` | warn | warn | bug | problem | yes | yes |  |
| `no-control-regex` | warn | warn | bug | problem | yes |  |  |
| `no-delete-var` | warn | warn | bug | suggestion | yes |  |  |
| `no-dupe-args` | warn | warn | bug | problem | yes | yes |  |
| `no-dupe-class-members` | off | warn | bug | problem | yes | yes |  |
| `no-dupe-keys` | warn | warn | bug | problem | yes | yes |  |
| `no-duplicate-case` | warn | warn | bug | problem | yes |  |  |
| `no-empty-character-class` | warn | warn | bug | problem | yes |  |  |
| `no-empty-pattern` | warn | warn | bug | problem | yes |  |  |
| `no-eval` | warn | warn | bug | suggestion |  |  |  |
| `no-ex-assign` | warn | warn | bug | problem | yes |  |  |
| `no-extend-native` | warn | warn | bug | suggestion |  |  |  |
| `no-extra-bind` | warn | warn | style | suggestion |  |  |  |
| `no-extra-label` | warn | warn | style | suggestion |  |  |  |
| `no-fallthrough` | warn | warn | bug | problem | yes |  |  |
| `no-func-assign` | warn | warn | bug | problem | yes | yes |  |
| `no-global-assign` | warn | warn | bug | suggestion | yes |  |  |
| `no-implied-eval` | warn | warn | bug | suggestion |  |  |  |
| `no-invalid-regexp` | warn | warn | bug | problem | yes |  |  |
| `no-iterator` | warn | warn | bug | suggestion |  |  |  |
| `no-label-var` | warn | warn | style | suggestion |  |  |  |
| `no-labels` | warn | warn | style | suggestion |  |  |  |
| `no-lone-blocks` | warn | warn | style | suggestion |  |  |  |
| `no-loop-func` | warn | warn | bug | suggestion |  |  |  |
| `no-mixed-operators` | warn | warn | style | suggestion |  |  | yes |
| `no-multi-str` | warn | warn | style | suggestion |  |  |  |
| `no-new-func` | warn | warn | bug | suggestion |  |  |  |
| `no-new-object` | warn | warn | style | suggestion |  |  | yes |
| `no-new-symbol` | warn | warn | bug | problem | yes | yes |  |
| `no-new-wrappers` | warn | warn | bug | suggestion |  |  |  |
| `no-obj-calls` | warn | warn | bug | problem | yes | yes |  |
| `no-octal` | warn | warn | bug | suggestion | yes |  |  |
| `no-octal-escape` | warn | warn | bug | suggestion |  |  |  |
| `no-redeclare` | off | warn | bug | suggestion | yes | yes |  |
| `no-regex-spaces` | warn | warn | style | suggestion | yes |  |  |
| `no-restricted-globals` | error | error | bug | suggestion |  |  |  |
| `no-restricted-properties` | error | error | legacy | suggestion |  |  |  |
| `no-restricted-syntax` (*) | error | warn | style | suggestion |  |  |  |
| `no-script-url` | warn | warn | bug | suggestion |  |  |  |
| `no-self-assign` | warn | warn | bug | problem | yes |  |  |
| `no-self-compare` | warn | warn | bug | problem |  |  |  |
| `no-sequences` | warn | warn | bug | suggestion |  |  |  |
| `no-shadow-restricted-names` | warn | warn | bug | suggestion | yes |  |  |
| `no-sparse-arrays` | warn | warn | bug | problem | yes |  |  |
| `no-template-curly-in-string` | warn | warn | bug | problem |  |  |  |
| `no-this-before-super` | warn | warn | bug | problem | yes | yes |  |
| `no-throw-literal` | warn | warn | bug | suggestion |  |  |  |
| `no-undef` | off | error | bug | problem | yes | yes |  |
| `no-unreachable` | warn | warn | bug | problem | yes | yes |  |
| `no-unsafe-negation` | warn | warn | bug | problem | yes | yes |  |
| `no-unused-expressions` | off | error | bug | suggestion |  |  |  |
| `no-unused-labels` | warn | warn | bug | suggestion | yes |  |  |
| `no-unused-vars` (*) | off | warn | bug | problem | yes |  |  |
| `no-use-before-define` | off | warn | bug | problem |  |  |  |
| `no-useless-computed-key` | warn | warn | style | suggestion |  |  |  |
| `no-useless-concat` | warn | warn | style | suggestion |  |  |  |
| `no-useless-constructor` | off | warn | style | suggestion |  |  |  |
| `no-useless-escape` | warn | warn | style | suggestion | yes |  |  |
| `no-useless-rename` | warn | warn | style | suggestion |  |  |  |
| `no-whitespace-before-property` | warn | warn | style | layout |  |  | yes |
| `no-with` | warn | warn | bug | suggestion | yes | yes |  |
| `require-yield` | warn | warn | bug | suggestion | yes |  |  |
| `rest-spread-spacing` | warn | warn | style | layout |  |  | yes |
| `strict` | warn | warn | style | suggestion |  |  |  |
| `unicode-bom` | warn | warn | style | layout |  |  |  |
| `use-isnan` | warn | warn | bug | problem | yes |  |  |
| `valid-typeof` | warn | warn | bug | problem | yes |  |  |

### react

| Rule | TS | JS | Kind |
|---|---|---|---|
| `react/forbid-foreign-prop-types` | warn | warn | legacy |
| `react/jsx-no-comment-textnodes` | warn | warn | bug |
| `react/jsx-no-duplicate-props` | warn | warn | bug |
| `react/jsx-no-target-blank` | warn | warn | bug |
| `react/jsx-no-undef` | error | error | bug |
| `react/jsx-pascal-case` | warn | warn | style |
| `react/jsx-uses-react` | warn | warn | helper |
| `react/jsx-uses-vars` | warn | warn | helper |
| `react/no-danger-with-children` | warn | warn | bug |
| `react/no-direct-mutation-state` | warn | warn | bug |
| `react/no-is-mounted` | warn | warn | bug |
| `react/no-typos` | error | error | bug |
| `react/require-render-return` | error | error | bug |
| `react/style-prop-object` | warn | warn | bug |

### react-hooks

| Rule | TS | JS | Kind |
|---|---|---|---|
| `react-hooks/exhaustive-deps` | warn | warn | bug |
| `react-hooks/rules-of-hooks` | error | error | bug |

### jsx-a11y

| Rule | TS | JS | Kind |
|---|---|---|---|
| `jsx-a11y/alt-text` | warn | warn | a11y |
| `jsx-a11y/anchor-has-content` | warn | warn | a11y |
| `jsx-a11y/anchor-is-valid` | warn | warn | a11y |
| `jsx-a11y/aria-activedescendant-has-tabindex` | warn | warn | a11y |
| `jsx-a11y/aria-props` | warn | warn | a11y |
| `jsx-a11y/aria-proptypes` | warn | warn | a11y |
| `jsx-a11y/aria-role` | warn | warn | a11y |
| `jsx-a11y/aria-unsupported-elements` | warn | warn | a11y |
| `jsx-a11y/heading-has-content` | warn | warn | a11y |
| `jsx-a11y/iframe-has-title` | warn | warn | a11y |
| `jsx-a11y/img-redundant-alt` | warn | warn | a11y |
| `jsx-a11y/no-access-key` | warn | warn | a11y |
| `jsx-a11y/no-distracting-elements` | warn | warn | a11y |
| `jsx-a11y/no-redundant-roles` | warn | warn | a11y |
| `jsx-a11y/role-has-required-aria-props` | warn | warn | a11y |
| `jsx-a11y/role-supports-aria-props` | warn | warn | a11y |
| `jsx-a11y/scope` | warn | warn | a11y |

### import

| Rule | TS | JS | Kind |
|---|---|---|---|
| `import/first` | error | error | style |
| `import/no-amd` | error | error | legacy |
| `import/no-anonymous-default-export` | warn | warn | style |
| `import/no-webpack-loader-syntax` | error | error | legacy |

### flowtype

| Rule | TS | JS | Kind |
|---|---|---|---|
| `flowtype/define-flow-type` | warn | warn | legacy |
| `flowtype/require-valid-file-annotation` | warn | warn | legacy |
| `flowtype/use-flow-type` | warn | warn | legacy |

### @typescript-eslint

| Rule | TS | JS | Kind |
|---|---|---|---|
| `@typescript-eslint/consistent-type-assertions` | warn | - | style |
| `@typescript-eslint/no-array-constructor` | warn | - | style |
| `@typescript-eslint/no-redeclare` | warn | - | bug |
| `@typescript-eslint/no-unused-expressions` | error | - | bug |
| `@typescript-eslint/no-unused-vars` (*) | error | - | bug |
| `@typescript-eslint/no-use-before-define` | warn | - | bug |
| `@typescript-eslint/no-useless-constructor` | warn | - | style |

## Sources and method

- Resolved config, the primary evidence: `node_modules/.bin/eslint --print-config <file>` for `src/app/index.tsx`, `src/app/App.test.tsx`, `src/main/api.ts`, `electron.vite.config.js`, `vitest.config.mjs`. The three TypeScript files resolve to the same 137 rule entries (128 active); a test file gets nothing extra. The two JavaScript files resolve to the same 124.
- Which side a rule comes from: `node_modules/eslint-config-react-app/index.js` and `base.js` (rule lists and the TypeScript override), `jest.js` (the unused jest and testing-library preset), against `.eslintrc.cjs`.
- Versions and declared ranges: each package's `package.json` under `node_modules`.
- `meta.type` and `meta.deprecated`: `require('eslint/use-at-your-own-risk').builtinRules`.
- `eslint:recommended` membership: `node_modules/@eslint/js` 8.57.1, `configs.recommended.rules`.
- `tsc` coverage: `node_modules/@typescript-eslint/eslint-plugin/dist/configs/eslint-recommended-raw.js`, which names the ts diagnostic for each rule it switches off.
- `tsconfig.json` for `jsx`, `strict`, and the absent `allowUnreachableCode` and `noFallthroughCasesInSwitch`.

## Not verified

- Whether each rule is still in `eslint:recommended` under ESLint 9 or later. The column is for 8.57.1; ESLint 9 changed that set.
- Violation counts if any currently-absent rule were switched on. `yarn lint` is clean today, so all 128 active rules have zero hits; the only suppression in the linted set is one bare `// eslint-disable-next-line` at `src/main/index.ts:105`.
- The ts diagnostic numbers quoted for `react/jsx-no-undef` and `react/jsx-no-duplicate-props` are from memory, not from a run.
- The bug/style split is a judgement call per rule, not something ESLint metadata states; the plugin rules of `react` and `jsx-a11y` carry no `meta.type`.
