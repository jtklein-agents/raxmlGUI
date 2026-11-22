# Where ESLint 9 and 10 leave the core formatting rules

Research for #325 (map #321). Checked on 2026-11-22 and 2026-11-23. Versions move; re-run the commands before relying on a number.

## Answer

- All four rules (`indent`, `comma-dangle`, `space-in-parens`, `multiline-ternary`) still ship in ESLint 9.39.5 and in 10.15.0. They are deprecated since 8.53.0 and marked `availableUntil: "11.0.0"`. No ESLint 11 release or prerelease exists on npm.
- `@stylistic/eslint-plugin` 6.0.1 has each rule under the `@stylistic/` prefix, and each accepts the exact option value `.eslintrc.cjs` uses today. It supports ESLint `^9.0.0 || ^10.0.0`.
- On this repo's linted file set under ESLint 10.15.0, the four core rules report 0 messages. The stylistic versions report 22, all `@stylistic/indent`, all in `.tsx` files, all autofixable.
- Prettier 3 can reproduce `comma-dangle` and the base of `indent`. It cannot reproduce `space-in-parens: always` or `multiline-ternary: always`, and it has no option for either.

## Status in ESLint core

| Rule | In 9.39.5 | In 10.15.0 | Deprecated since | Marked available until |
| --- | --- | --- | --- | --- |
| `indent` | shipped | shipped | 8.53.0 | 11.0.0 |
| `comma-dangle` | shipped | shipped | 8.53.0 | 11.0.0 |
| `space-in-parens` | shipped | shipped | 8.53.0 | 11.0.0 |
| `multiline-ternary` | shipped | shipped | 8.53.0 | 11.0.0 |

Sources:

- The npm tarballs `eslint-9.39.5.tgz` and `eslint-10.15.0.tgz`: each has `lib/rules/<rule>.js` for all four, and each rule's `meta.deprecated` reads `deprecatedSince: "8.53.0"`, `availableUntil: "11.0.0"`, with `@stylistic/eslint-plugin` named as the replacement. 91 rules in each tarball carry `availableUntil: "11.0.0"`.
- `comma-dangle.js` and `multiline-ternary.js` are byte-identical in the two tarballs. `space-in-parens.js` and `indent.js` differ only in an internal call (`isSpaceBetweenTokens` became `isSpaceBetween`) and in code layout. The option schemas are the same.
- `npm view eslint dist-tags`: `latest` 10.15.0, `maintenance` 9.39.5, `next` 10.0.0-rc.2. No `11.*` version is published. 9.0.0 was published on 2024-04-05 and 10.0.0 on 2026-02-06.
- The rule page <https://eslint.org/docs/latest/rules/space-in-parens>: "This rule was deprecated in ESLint v8.53.0. It will be removed in v11.0.0. Please use the corresponding rule in @stylistic/eslint-plugin."
- The deprecation post <https://eslint.org/blog/2023/10/deprecating-formatting-rules/>: the rules "will not be removed until at least ESLint v10.0.0 (if not later)". It lists all four rules.
- <https://github.com/eslint/eslint/pull/20144>, merged 2025-09-21 and released in 9.37.0, set `availableUntil` on the formatting rules. It words the removal as "planned".
- The deprecation policy <https://eslint.org/docs/latest/use/rule-deprecation>: a deprecated rule gets no more work, and issues and pull requests for it are closed.
- The v10 migration guide <https://eslint.org/docs/latest/use/migrate-to-10.0.0> removes no formatting rule. It does remove the eslintrc format ("Starting with ESLint v10.0.0, the old configuration format is no longer supported") and requires Node `^20.19.0 || ^22.13.0 || >=24`.

So the removal version is a plan recorded in rule metadata, with no date. Until then the rules run but are unmaintained.

## `@stylistic/eslint-plugin` equivalents

`npm view @stylistic/eslint-plugin version peerDependencies engines`:

- `version`: 6.0.1 (published 2026-11-16; 6.0.0 on 2026-11-14)
- `peerDependencies`: `eslint: ^9.0.0 || ^10.0.0`, `oxlint: ^1.55.0`, both optional
- `engines`: `node: ^20.19.0 || ^22.13.0 || >=24`
- The package is ESM-only (`"type": "module"`). The migration guide <https://eslint.style/guide/migration> says: "Since v4, we moved the plugin to ESM-only, which only supports flat config and ESLint v9+."
- The last 5.x, 5.10.0, has the same ESLint peer range and allows Node `^18.18.0 || ^20.9.0 || >=21.1.0`.
- `@stylistic/eslint-plugin-js` and `-ts`, which the 2023 ESLint post names, stopped at 4.4.1. The migration guide describes one merged plugin that covers JavaScript, TypeScript and JSX with one rule each.

Option schemas, read from `dist/dts/rule-options2.d.ts` and `dist/rules/*.js` in the 6.0.1 tarball and compared with `lib/rules/*.js` in ESLint 10.15.0:

| Current setting | Stylistic rule | Same options accepted | Differences from core |
| --- | --- | --- | --- |
| `indent: [2, { SwitchCase: 1 }]` | `@stylistic/indent` | yes | Default `SwitchCase` is 1 (core: 0); the config sets it, so no effect. Adds `assignmentOperator`, `tabLength`, `jsx`, `returnType`. Handles TypeScript nodes and JSX children, which core `indent` does not. |
| `comma-dangle: 'always-multiline'` | `@stylistic/comma-dangle` | yes | The string form also applies to `enums`, `generics`, `tuples`, `importAttributes` and `dynamicImports`. Core applies it to arrays, objects, imports, exports and functions. |
| `space-in-parens: 'always'` | `@stylistic/space-in-parens` | yes | None found. Same schema, same messages. |
| `multiline-ternary: 'always'` | `@stylistic/multiline-ternary` | yes | Adds a second option `{ ignoreJSX }`, default false. |

The `e2e/**` override that turns `space-in-parens` off has no bearing here: `yarn lint` does not lint `e2e/`.

### Measured on this repo

A throwaway flat config enabled the four core rules and the four stylistic rules side by side, with the options above, and linted the `yarn lint` file set (`src/**/*.{js,jsx,ts,tsx}`, `electron.vite.config.js`, `vitest.config.mjs`; 156 files) at `origin/master` acd4e44. Versions: ESLint 10.15.0, `@typescript-eslint/parser` 8.73.0 for every file, Node 22.18.0.

| Rule set | Messages |
| --- | --- |
| Four core rules, ESLint 10.15.0 | 0 |
| Four stylistic rules, 6.0.1 | 22, all `@stylistic/indent` |
| Four stylistic rules, 5.10.0 | the same 22 |

All 22 carry a fix. They sit in `src/app/AlignmentCard.tsx` (6), `src/app/Input.tsx` (8), `src/app/Output.tsx` (1), `src/app/PartitionEditor.tsx` (1), `src/app/Raxml.tsx` (2) and `src/app/components/ErrorDialog.tsx` (4). The two sites read by hand are JSX text children written at the same column as their parent element, for example `AlignmentCard.tsx` lines 322 to 324. Core `indent` does not check that.

A deliberately wrong snippet tripped all eight rules, so the 0 is not a silent no-op.

The broader string form of `@stylistic/comma-dangle` produced no message.

## What Prettier 3 can reproduce

Options from <https://prettier.io/docs/options>; `.prettierrc` sets `tabWidth: 2`, `useTabs: false`, `bracketSpacing: true` and leaves `trailingComma` at its default. Checked by running Prettier 3.10.1 (`npm view prettier dist-tags.latest`) with the repo's `.prettierrc` on a sample written in the repo's style.

| Rule | Prettier 3 | Evidence |
| --- | --- | --- |
| `indent: [2, { SwitchCase: 1 }]` | Yes for the base: 2 spaces, `case` one level inside `switch`. | `tabWidth: 2`; the sample kept both. |
| `comma-dangle: 'always-multiline'` | Yes. | `trailingComma` defaults to `"all"` since 3.0.0. |
| `space-in-parens: 'always'` | No. | No option covers it. `bracketSpacing` is "Print spaces between brackets in object literals" only. The sample's `pick( value, list )` came out as `pick(value, list)`. |
| `multiline-ternary: 'always'` | No. | Prettier prints an expression on one line when it fits. The sample's three-line ternary came out as `value ? 'yes' : 'no'`, also with `--experimental-ternaries`. |

Prettier will not gain these options: <https://prettier.io/docs/option-philosophy> says "Option requests aren't accepted anymore" and "for formatting-related options, this is final".

`prettier --list-different` with the repo's `.prettierrc` names 145 of the linted files. The source tree is not in Prettier's style today, mostly because of the parenthesis spacing.

## Not verified

- That Prettier's output always satisfies `indent` beyond the base case (continuation lines, chained calls). Only the sample was run.
- The linted run used `@typescript-eslint/parser` for `.js` and `.jsx` too. Today `eslint-config-react-app` parses those with Babel. The counts could shift under another parser.
- Only two of the 22 `@stylistic/indent` sites were read by hand; the other 20 are JSX lines with the same message shape.
- Whether ESLint 11 will in fact drop the rules. The only sources are the rule metadata, the docs banner generated from it, and the PR that calls it "planned".
- `https://eslint.org/docs/latest/rules/deprecated` returned 404; the per-rule metadata stood in for it.
