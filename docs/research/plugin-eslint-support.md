# Which ESLint major the kept plugins support

Research for [#322](https://github.com/jtklein-agents/raxmlGUI/issues/322), under map [#321](https://github.com/jtklein-agents/raxmlGUI/issues/321). Read on 2026-11-22. Sources are npm registry metadata (`npm view`), the plugins' GitHub repos, and one throwaway install outside the repo (see "Smoke test").

## Answer in brief

- The newest ESLint major is **10** (`latest` is 10.15.0; no 11 exists on npm). ESLint 10 reads flat config only.
- `typescript-eslint` 8.73.0 and `eslint-plugin-lodash` 8.1.0 declare ESLint 10 support in their peer ranges.
- `eslint-plugin-import` 2.32.0 (June 2025, the newest release) declares **`^9` at most**. ESLint 10 support is merged on its `main` but unreleased, with no release date.
- **By declared support, the kept set tops out at ESLint 9.** Swap `eslint-plugin-import` for `eslint-plugin-import-x` 4.18.1 and the set **supports ESLint 10**.
- `eslint-plugin-import-x` has both rules the config uses (`no-cycle`, `consistent-type-specifier-style`). `eslint-plugin-lodash` needs no successor.

## Per package

| Package | Latest | Published | `eslint` peer range | Flat config |
| --- | --- | --- | --- | --- |
| `eslint` | 10.15.0 (`maintenance`: 9.39.5) | | | 10: flat only |
| `typescript-eslint` (also `@typescript-eslint/parser`, `/eslint-plugin`) | 8.73.0 | 2026-11-21 | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | yes, `tseslint.plugin`, `tseslint.parser`, `tseslint.configs.*` |
| `eslint-plugin-lodash` | 8.1.0 | 2026-09-16 | `>=9.0.0` | plugin object works; shipped presets are eslintrc-shaped |
| `eslint-plugin-import` | 2.32.0 | 2025-06-20 | `^2 \|\| … \|\| ^8 \|\| ^9` | yes, `flatConfigs.*` |
| `eslint-plugin-import-x` | 4.18.1 | 2026-11-09 | `^8.57.0 \|\| ^9.0.0 \|\| ^10.0.0` | yes, `importX.flatConfigs.*` |

Source for every row: `npm view <pkg> version peerDependencies time dist-tags`, run 2026-11-22.

### ESLint

- npm dist-tags: `latest` 10.15.0, `maintenance` 9.39.5. There is no 11.
- ESLint 10 removed the eslintrc format and requires Node `^20.19.0 || ^22.13.0 || >=24` ([migrate-to-10.0.0.md](https://github.com/eslint/eslint/blob/v10.15.0/docs/src/use/migrate-to-10.0.0.md), sections "Old config format no longer supported" and "Node.js < v20.19, v21, v23 are no longer supported"). This repo's `.nvmrc` is 22.18.0 and CI uses Node 24, so both fit.

### typescript-eslint

- 8.73.0 accepts ESLint 8.57, 9 and 10, and TypeScript `>=4.8.4 <6.1.0`. The repo's TypeScript `^5.9.3` fits.
- The repo already runs the v8 line (`package.json` devDependencies `^8`, `resolutions` `^8.72.1`), so the upgrade to ESLint 10 needs no typescript-eslint major change.
- `typescript-eslint` is the one-package entry point for flat config; `@typescript-eslint/parser` and `@typescript-eslint/eslint-plugin` carry the same peer range.

### eslint-plugin-lodash

- 8.1.0 was published 2026-09-16; its [changelog](https://github.com/idok/eslint-plugin-lodash/blob/master/CHANGELOG.md) entry is "[prop-shorthand] fix ESLint v9 incompatibility". The previous release, 8.0.0, is from May 2024.
- Peer range `>=9.0.0` is open-ended: it admits ESLint 10 but is not evidence of testing against it. The repo has no issue or changelog line about ESLint 10.
- The npm `repository` field now points at `idok/eslint-plugin-lodash`, not the `wix` organisation the README still links.
- The README documents eslintrc usage only. The package exports `meta`, `rules`, `configs`, `processors`; `configs.recommended` is `{ plugins: ['lodash'], rules: … }`, an eslintrc shape that flat config rejects. Registering the plugin object and naming `lodash/import-scope` directly works (smoke test below), and that is all `.eslintrc.cjs` needs.
- Odd fact: the repo today pairs `eslint-plugin-lodash@^8.1.0` (peer `>=9.0.0`) with `eslint@^8.57.0`, outside the declared range.

### eslint-plugin-import

- 2.32.0 is the newest release, published 2025-06-20. Its peer range ends at `^9`.
- ESLint 10 support was merged on 2026-06-29 in [PR #3230](https://github.com/import-js/eslint-plugin-import/pull/3230). `package.json` on `main` now lists `^10`, and `CHANGELOG.md` has "support eslint v10" under **Unreleased**.
- The release request, [issue #3278](https://github.com/import-js/eslint-plugin-import/issues/3278) "Cut new release", is still open. The maintainer's last word there (2026-09-02) is that there are no updates to give; a duplicate, [#3292](https://github.com/import-js/eslint-plugin-import/issues/3292), was answered "Yes" to "is a release planned" with no date.
- The repo's installed copy is 2.30.0 (`yarn.lock`, pulled in by `eslint-config-react-app`), whose peer range ends at `^8`. `^9` arrived in 2.31.0.
- Flat config: `flatConfigs` with `recommended`, `errors`, `warnings`, `react`, `react-native`, `electron`, `typescript`.
- Open [issue #3148](https://github.com/import-js/eslint-plugin-import/issues/3148) reports a speed regression in `import/no-cycle` when moving from legacy to flat config. Not measured here.

### eslint-plugin-import-x (successor)

- 4.18.1, peer `eslint: ^8.57.0 || ^9.0.0 || ^10.0.0`, plus `@typescript-eslint/utils: ^8.56.0` and `eslint-import-resolver-node: *`, both marked optional in `peerDependenciesMeta`.
- Has `no-cycle` and `consistent-type-specifier-style` (checked in the installed package's `rules`).
- Rule IDs take the prefix of the key the plugin is registered under. Registered as `import`, the existing rule names `import/no-cycle` and `import/consistent-type-specifier-style` stay unchanged. Settings keys are always `import-x/*`.
- For `.ts` files `no-cycle` reports nothing until the settings name the TypeScript extensions and parser. `importX.flatConfigs.typescript.settings` supplies them (`import-x/extensions`, `import-x/parsers`); with only a resolver configured, the cycle in the smoke test went unreported.

## Rule coverage

| Rule in `.eslintrc.cjs` | ESLint 9 | ESLint 10 |
| --- | --- | --- |
| `lodash/import-scope` | `eslint-plugin-lodash` 8.1.0 | `eslint-plugin-lodash` 8.1.0 |
| `import/no-cycle` | `eslint-plugin-import` 2.32.0 or `import-x` | `eslint-plugin-import-x` 4.18.1 |
| `import/consistent-type-specifier-style` | `eslint-plugin-import` 2.32.0 or `import-x` | `eslint-plugin-import-x` 4.18.1 |
| `@typescript-eslint/*` | `typescript-eslint` 8.73.0 | `typescript-eslint` 8.73.0 |

## Smoke test

A scratch project outside the repo, installed with `npm i --legacy-peer-deps`: `eslint@10.15.0`, `eslint-plugin-lodash@8.1.0`, `eslint-plugin-import@2.32.0`, `eslint-plugin-import-x@4.18.1`, `typescript-eslint@8.73.0`, `typescript@5.9.3`, Node 22.18.0. Two `.ts` files that import each other; one has `import _ from 'lodash'` and an inline `type` specifier. Flat config with `tseslint.parser` and the three rules.

- With `eslint-plugin-import-x` registered as `import` and `importX.flatConfigs.typescript.settings` plus `createNodeResolver`: all three rules reported (`lodash/import-scope` once, `import/no-cycle` in both files, `import/consistent-type-specifier-style` once).
- With `eslint-plugin-import@2.32.0`: the same four reports, no crash. The released version ran these three rules on ESLint 10 despite the peer range. This is one tiny case, not support: PR #3230 lists APIs ESLint 10 removed that other rules of the plugin still call in 2.32.0.

## Not verified

- No run against this repo's `src/**`. Rule behaviour, report counts and lint time on the real tree are unknown, including `no-cycle` speed under flat config for either import plugin.
- `eslint-plugin-lodash` on ESLint 10 beyond `import-scope`. Its other rules were not exercised.
- Whether `eslint-plugin-import-x`'s `no-cycle` and `eslint-plugin-import`'s report the same cycles on this codebase.
- Which resolver the real config needs for `eslint-plugin-import-x` (the test used the built-in `createNodeResolver` with explicit extensions; `flatConfigs.typescript` names `eslint-import-resolver-typescript`, which was not installed).
- When `eslint-plugin-import` will release ESLint 10 support.
