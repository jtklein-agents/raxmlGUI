# Modern flat-config bases for an Electron, React and TypeScript app

Research for ticket #324 (map #321). Snapshot date: 2026-11-22. This file compares candidates. It does not pick one; a later ticket decides.

## Method and sources

- Versions, peer ranges, engines and publish dates: `npm view <pkg> version peerDependencies dependencies engines time.modified`, run 2026-11-22.
- Rule contents: the published tarballs (`npm pack <pkg>`), read directly. File paths below are inside each tarball.
- Repository activity: `gh api repos/<owner>/<repo>` (`pushed_at`, `archived`).
- electron-vite templates: `alex8088/quick-start`, `packages/create-electron/playground/react-ts/` and `react/` (last commit to `react-ts` 2026-10-14).

## What the repo has today

`.eslintrc.cjs` extends `react-app` (`eslint-config-react-app` 7.0.1, peer `eslint ^8.0.0`) and adds these style rules itself:

| Rule | Repo setting |
| --- | --- |
| `indent` | 2 spaces, `SwitchCase: 1` |
| `comma-dangle` | `always-multiline` |
| `space-in-parens` | **`always`** (`foo( a )`) |
| `multiline-ternary` | **`always`** |
| `prefer-destructuring` | objects yes, arrays no |
| `@typescript-eslint/consistent-type-imports` | separate `import type` |
| `@typescript-eslint/consistent-type-definitions` | `interface` |
| `@typescript-eslint/array-type` | `array` (`T[]`) |

Semicolons and quote style are not lint-enforced today. `.prettierrc` says `singleQuote: true, semi: true`, but no `package.json` script runs Prettier.

Environment that constrains the choice: Node 22.18.0 (`.nvmrc`), TypeScript ^5.9.3, `tsconfig.json` has `strict: false`.

## ESLint majors available

| Line | Version | Note |
| --- | --- | --- |
| `latest` | eslint 10.15.0 | engines `^20.19.0 \|\| ^22.13.0 \|\| >=24` |
| `maintenance` | eslint 9.39.5 | dist-tag `maintenance` |

`@eslint/js` 10.0.1 has peer `eslint ^10.0.0`, marked optional. `@eslint/js` 9.39.5 exists for ESLint 9.

## Comparison

"Style" means layout and syntax-preference rules. "Globals" means how the config tells `no-undef` which globals exist.

| Candidate | Version, last publish | Maintenance | ESLint majors (peer) | Code style it enforces | Type information | Per-process globals | Main trade-off |
| --- | --- | --- | --- | --- | --- | --- | --- |
| `@eslint/js` `recommended` + typescript-eslint `recommended` | @eslint/js 10.0.1 (2026-07); typescript-eslint 8.73.0 (2026-11-21) | Both first-party, active (typescript-eslint pushed 2026-11-22) | typescript-eslint: `^8.57 \|\| ^9 \|\| ^10`; TS `>=4.8.4 <6.1.0` | **None.** 64 correctness rules plus 20 TS correctness rules. No layout, no naming, no syntax preference | No | None set. typescript-eslint's `eslint-recommended` turns `no-undef` off for TS files | Smallest surface; every style rule the owner wants stays hand-written |
| … + typescript-eslint `stylistic` | same | same | same | 13 TS syntax-preference rules: `array-type`, `consistent-type-definitions`, `consistent-indexed-object-style`, `consistent-generic-constructors`, `consistent-type-assertions`, `class-literal-property-style`, `adjacent-overload-signatures`, `no-inferrable-types`, `prefer-for-of`, `prefer-function-type`, `no-empty-function`, `no-confusing-non-null-assertion`, `ban-tslint-comment`. **No whitespace or layout rules** | No | same | Covers two of the repo's TS overrides at their defaults (`array-type: array`, `consistent-type-definitions: interface`); does not cover `consistent-type-imports` or any layout |
| … + `recommendedTypeChecked` / `stylisticTypeChecked` | same | same | same | `stylisticTypeChecked` adds 8: `dot-notation`, `prefer-optional-chain`, `prefer-nullish-coalescing`, `prefer-includes`, `prefer-find`, `prefer-string-starts-ends-with`, `prefer-regexp-exec`, `non-nullable-type-assertion-style`. `recommendedTypeChecked` adds 23 safety rules (`no-floating-promises`, `no-misused-promises`, the `no-unsafe-*` family, `unbound-method`, …), none stylistic | **Yes** (`parserOptions.projectService` or `project`) | same | `no-unsafe-*` is noisy on a `strict: false` codebase with `.js` files; typed rules cannot run on `.js` files outside the tsconfig without `disableTypeChecked` |
| `@electron-toolkit/eslint-config` (JS) | 3.0.0 (2026-09-27) | Single maintainer (alex8088, electron-vite author); repo pushed 2026-09-27; previous release 2025-04 | `>=9.0.0`; bundles `@eslint/js ^10.0.1` | **None.** It is `@eslint/js` `recommended` plus `languageOptions` (26 lines) | No | **Merged, not per process**: `globals.browser + es2021 + node` for every file | Adds nothing over `@eslint/js` except a globals set that defeats per-process `no-undef` |
| `@electron-toolkit/eslint-config-ts` | 4.0.0 (2026-09-27) | same | `>=9.0.0`; bundles `@eslint/js ^10.0.1`, `typescript-eslint ^8.70.1` | Almost none. typescript-eslint `recommended` (or `recommendedTypeChecked`) plus 9 overrides: requires `explicit-function-return-type`, turns **off** `explicit-module-boundary-types` and `no-non-null-assertion`, allows empty arrow functions and empty interfaces. Does **not** include typescript-eslint `stylistic` | Optional (`configs.recommendedTypeChecked`) | Same merged set as above | Thin wrapper. Turns off `explicit-module-boundary-types`, which this repo sets to `error`. What the electron-vite `react-ts` template uses |
| `@electron-toolkit/eslint-config-prettier` | 3.0.1 (2026-09-27) | same | `>=9.0.0`, `prettier >=3` | **All formatting, via Prettier**: `eslint-plugin-prettier/recommended` with `prettier/prettier` as `warn`; switches off every conflicting ESLint layout rule | No | n/a | Prettier's output replaces the repo's hand-set layout. Prettier has no spaces-inside-parentheses option, so `space-in-parens: always` could not survive (not re-verified by running Prettier; see Open points). `yarn lint` uses `--max-warnings 0`, so `warn` still fails |
| neostandard | 0.14.1 (2026-10-13) | Active, multi-maintainer org; pushed 2026-11-16; still 0.x with a "Missing for 1.0.0" list | `^9.22.0 \|\| ^10.0.0`; Node `^22.13.0 \|\| >=24` | **Full Standard style** via `@stylistic` (pinned 5.10.0), about 55 layout rules: 2-space indent, single quotes, **no semicolons** (`semi: true` option flips to always), `space-before-function-paren: always`, **`space-in-parens: never`**, `multiline-ternary: always-multiline`, `comma-dangle` relaxed to `ignore`, 1tbs braces, JSX single quotes and JSX layout rules. Plus over 100 core, `n` and `promise` rules incl. syntax preferences (`eqeqeq`, `curly: multi-line`, `one-var`, `camelcase`, `yoda`, `prefer-const`). `noStyle: true` drops all layout rules | No. `ts: true` only swaps the parser and core rules for their `@typescript-eslint` equivalents; it adds **no** typescript-eslint preset | Merged: `es2022 + node` plus `window`, `document`, `navigator` for every file. `env` / `globals` options add more, also for every file | Most complete style out of the box, but three of its values contradict the repo's (`space-in-parens`, `multiline-ternary`, `comma-dangle`), and the README asks extenders to only tighten, not relax. React logic rules are removed in 0.14 (only a native `jsx-key`). No import rules since 0.13 |
| `@stylistic/eslint-plugin` `configs.customize()` (not in ticket) | 6.0.1 (2026-11-16) | Active community org; pushed 2026-11-16 | `^9.0.0 \|\| ^10.0.0`; Node `^20.19.0 \|\| ^22.13.0 \|\| >=24` | **Layout only, parameterised**: 64 rules from a factory with options `indent` (2), `quotes` (single), `semi` (false), `commaDangle` (`always-multiline`), `braceStyle` (stroustrup), `arrowParens`, `quoteProps`, `jsx`. Fixed values include `space-in-parens: never`, `multiline-ternary: always-multiline`, `operator-linebreak: before` | No | None | Not a base on its own; a style layer to put over `@eslint/js` + typescript-eslint. Matches the repo's `comma-dangle` and indent by default; `space-in-parens` and `multiline-ternary` still need overrides. Home of the successors to the core layout rules the repo uses today |
| `eslint-config-love` (not in ticket) | 158.0.0 (2026-10-02) | Active; pushed 2026-11-21; nearly every release is a major by policy | **`^10.0.0` only** (v123 still peered `^9.35.0`; v156 peers `^10.0.0`) | Syntax and safety preferences, 264 rules; **"No formatting rules (please use a formatter)"** | **Yes, required** (`projectService: true` is in the config) | None | Strictest option ("safety at the cost of verbosity"); written for strict TypeScript, repo is `strict: false`; forces ESLint 10 |
| `eslint-config-xo` (not in ticket) | 8.0.0 (2026-11-16) | Active (sindresorhus) | `>=10.4`; **`typescript >=6`**; **Node `>=22.22.2`** | Full style via `@stylistic` 6: tabs by default (`space: true` gives 2 spaces), semicolons, single quotes; plus unicorn, import-x, regexp, jsdoc, n | Not checked | `browser: true` switches Node globals for browser globals, config-wide | **Does not fit today**: needs TypeScript 6 and a newer Node than `.nvmrc` |
| `eslint-config-airbnb-extended` (not in ticket) | 3.3.0 (2026-10-02) | Active community fork; pushed 2026-11-21. The original `eslint-config-airbnb` 19.0.4 still peers `eslint ^7.32.0 \|\| ^8.2.0` | **`^9.0.0` only** | Full Airbnb style via `@stylistic`: semicolons, single quotes, `comma-dangle: always-multiline`, `max-len` 100, `space-in-parens: never`, `multiline-ternary` off; plus React, jsx-a11y, import rules | Yes for its TypeScript config (`projectService: true`) | Composable `base` / `node` / `react` configs; React config adds `globals.browser` | Closest to `react-app`'s plugin set and to the repo's semicolon and trailing-comma habits, but caps the project at ESLint 9 |
| `@antfu/eslint-config` (not in ticket) | 10.0.0 | Active; pushed 2026-10-23 | `^9.10.0 \|\| ^10.0.0` | Full style via `@stylistic`: single quotes, **no semicolons** by default (configurable), sorted imports, plus personal rules (top-level `function` declarations, brace-less one-line `if`); `lessOpinionated: true` drops some | Optional (`typescript.tsconfigPath`) | Not checked | Self-described "very personal and opinionated" and meant to be the only top-level config; renames plugin prefixes (`style/*`, `ts/*`); React via `@eslint-react`, opt-in |

## Findings that cut across candidates

1. **No candidate scopes globals per Electron process.** The two that set globals at all (`@electron-toolkit/*`, neostandard) merge browser and Node globals for every file. Under either, `no-undef` cannot flag `window` in main-process code or `process` in page code. Per-process globals have to be written by hand with the `globals` package (17.14.0) in every option.
2. **`no-undef` does not run on TypeScript files** under any typescript-eslint-based config; the tsconfig `lib` and `types` decide there. Per-process globals blocks therefore only affect the `.js` files under `src`.
3. **The electron-vite template is a thin stack, not a style guide.** `react-ts` uses `@electron-toolkit/eslint-config-ts` `recommended`, `eslint-plugin-react` flat `recommended` + `jsx-runtime`, `eslint-plugin-react-hooks`, `eslint-plugin-react-refresh`, then `@electron-toolkit/eslint-config-prettier` last. One config for all three processes, no per-process blocks. All style comes from Prettier. It pins `eslint ^9.39.5`.
4. **Only three sources carry layout rules**: Prettier (through `eslint-plugin-prettier`), `@stylistic/eslint-plugin` (directly, or inside neostandard, xo, airbnb-extended, antfu), and nothing else. ESLint core's own layout rules (`indent`, `comma-dangle`, `space-in-parens`, `multiline-ternary`, which `.eslintrc.cjs` uses) are the ones `@stylistic` took over.
5. **The repo's `space-in-parens: always` matches no candidate.** Every style-carrying config sets `never`. It stays a local override under any `@stylistic`-based option and is lost under Prettier.
6. **React logic rules and ESLint 10.** `eslint-plugin-react` 7.37.5 peers `^9.7`; its ESLint 10 issue (jsx-eslint/eslint-plugin-react#3977) is still open. neostandard 0.14 removed its React rules for that reason. `eslint-plugin-react-hooks` 7.1.1 and `@eslint-react/eslint-plugin` 5.30.6 both accept ESLint 10. No base config here supplies React rules that work on ESLint 10 except `@antfu/eslint-config` (via `@eslint-react`, opt-in).

## Open points and limits

- That ESLint core's layout rules were deprecated in favour of `@stylistic` is prior knowledge, backed here only by neostandard's source comments. Whether ESLint 10 core still ships `indent`, `comma-dangle`, `space-in-parens` and `multiline-ternary` was not checked.
- Rule counts are greps over the published config files, not a resolved-config dump (`eslint --print-config`).
- "Prettier has no spaces-inside-parentheses option" is from prior knowledge of Prettier's option list; the worktree had no `node_modules`, so it was not checked by running Prettier.
- `@electron-toolkit/*` depend on `@eslint/js ^10.0.1` while peering `eslint >=9.0.0`. The template runs that pair on ESLint 9.39.5, so it works there; whether every rule in the v10 `recommended` set exists in older 9.x was not checked.
- `@antfu/eslint-config`'s globals handling and exact rule set were not read in depth.
- No candidate was installed or run against `src`. Violation counts are a later ticket's job.
- Non-ESLint linters (Biome, oxlint) are outside the map's destination and were not examined.
