# Vitest fit for this toolchain

Research for [#286](https://github.com/jtklein-agents/raxmlGUI/issues/286), under map [#285](https://github.com/jtklein-agents/raxmlGUI/issues/285). Read on 2026-11-22. Nothing was installed or run; every claim below is from a document or a source file, and the "Not verified" section lists what only a spike can prove.

## Answer in brief

- Use **Vitest 5.1.1** (`vitest@^5.1.1`, npm `latest`). It accepts Vite 8 and Node 22.18.
- Add **`jsdom@^29.1.1`** as a direct dev dependency. jsdom 30 and 31 refuse Node 22.18.
- Vitest **cannot read `electron.vite.config.js`**. It needs its own `vitest.config.*` at the repo root.
- `jest.fn`, `jest.spyOn`, `jest.restoreAllMocks` rename to `vi.*`. `jest.mock` + `require` and `jest.isolateModules` need rewrites, because `require()` bypasses Vitest's transforms and mocks.
- No Babel is needed. `transformIgnorePatterns` and the `.css` mapper have no replacement because the problem they solve is gone.

## Version fit

Local facts: `.nvmrc` is `22.18.0`; CI workflows use Node 24; `yarn.lock` has `vite 8.3.7`, `electron-vite 6.0.0`, `jsdom 16.7.0` (through `jest-environment-jsdom 27.5.1`); `vite` is already a direct dev dependency.

| Package | Version | `engines.node` | `vite` peer | Fits Node 22.18 + Vite 8.3.7 |
|---|---|---|---|---|
| `vitest` (`latest`) | 5.1.1, 2026-11-18 | `^22.12.0 \|\| ^24.0.0 \|\| >=26.0.0` | `^6.4.0 \|\| ^7.0.0 \|\| ^8.0.0` (required peer) | yes |
| `vitest` (`V4` tag) | 4.1.12, 2026-10-15 | `^20.0.0 \|\| ^22.0.0 \|\| >=24.0.0` | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | yes (fallback) |
| `electron-vite` | 6.0.0 | `^20.19.0 \|\| >=22.12.0` | `^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0` | yes |
| `jsdom` | 29.1.1 | `^20.19.0 \|\| ^22.13.0 \|\| >=24.0.0` | n/a | yes |
| `jsdom` | 30.0.0 to 31.0.1 (`latest`) | `^22.22.2 \|\| ^24.15.0 \|\| >=26.0.0` | n/a | **no** on 22.18 |

Source: `npm view <pkg>@<version> engines peerDependencies` against the npm registry.

- The Vitest 5 docs state the same floor: "Vitest requires Vite >=v6.4.0 and Node >=v22.12.0" ([guide](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/guide/index.md)).
- Vitest 5 made `vite` a required peer. "Yarn does not [install peers], so after the upgrade Vitest cannot resolve `vite` unless it is listed in your `package.json`" ([migration guide](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/guide/migration/index.md)). This repo already lists it.
- `jsdom` is an optional peer of Vitest with range `*`. "They don't come with Vitest, you will need to install them separately" ([features](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/guide/features.md)). The move is jsdom 16 to 29: thirteen majors of DOM behaviour change.
- To use jsdom 31 instead, raise `.nvmrc` to 22.22.2 or later. That is a separate decision.
- Vitest 4.1.12 is the fallback if a v5 default bites. It lacks the v5 changes listed under "Vitest 5 defaults" below.
- New packages: `vitest` and `jsdom` only. `@vitejs/plugin-react` is already installed and is optional for tests (see `transform`).

## Config file

Vitest does not read `electron.vite.config.js`.

- "When an explicit `--config` option is not provided, Vitest looks for `vitest.config.{ts,mts,cts,js,mjs,cjs}` first and `vite.config.{ts,mts,cts,js,mjs,cjs}` second in the project root. If no config file is found, Vitest will run without one." ([config](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/index.md))
- `--config electron.vite.config.js` does not help. That file exports `{ main, preload, renderer }`, each a Vite config ([electron-vite config](https://electron-vite.org/config/)). Vitest expects one Vite config with a top-level `test` key.
- The electron-vite guide and config pages do not mention Vitest or testing.

So: one `vitest.config.js` (or `.ts`) at the root. It can import the electron-vite config and reuse the `renderer` block, but that file is a function of `{ command }` and pulls the Sentry plugin. Copying the one alias is smaller. Vitest 5 no longer searches parent directories for a config, so run it from the repo root.

Sketch, untested:

```js
import { resolve } from 'node:path';
import { defineConfig } from 'vitest/config';

export default defineConfig( {
  resolve: {
    alias: {
      // Same alias as renderer in electron.vite.config.js.
      filenamify: resolve( import.meta.dirname, 'node_modules/filenamify/filenamify.js' ),
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    clearMocks: false,
    include: [ 'src/**/*.test.?(c|m)[jt]s?(x)', 'e2e/helpers/**/*.test.?(c|m)[jt]s?(x)' ],
    setupFiles: [ './jest/setup.js', './jest/mobxActionWarning.js' ],
    alias: {
      electron: resolve( import.meta.dirname, 'jest/electron.js' ),
      '@sentry/electron/renderer': resolve( import.meta.dirname, 'jest/sentry.js' ),
    },
  },
} );
```

## Jest feature to Vitest replacement

| Jest feature (uses) | Vitest replacement | Behaviour difference |
|---|---|---|
| Globals `it`, `expect`, `beforeEach`, `jest` | `globals: true`, or `import { it, expect, vi } from 'vitest'` | Off by default. Types for globals need `"types": ["vitest/globals"]` in `tsconfig.json`. No `jest` namespace for types: `import type { Mock } from 'vitest'`. |
| `jest.fn` (96) | `vi.fn` | Same call shape. `mockReset` restores the original implementation instead of an empty one; the suite does not call `mockReset`. |
| `jest.spyOn` (21) | `vi.spyOn` | Same call shape. Can also spy on ES module namespace exports under the module runner. |
| `jest.restoreAllMocks` (1) | `vi.restoreAllMocks` | Restores only `vi.spyOn` spies. It "will not clear mock history or reset the mock implementation" of `vi.fn` mocks. The one site (`finalAlignment.test.js`) only restores `console` spies, so it is unaffected. |
| `jest.mock` (2, both in `src/main/getActiveState.test.js`) | `vi.mock`, at the top level of the file | Still hoisted. Works **only for `import`**, not `require`. The factory must return every export; a default export needs a `default` key. A nested `vi.mock` throws in v5. Variables used in a factory must come from `vi.hoisted` (the `mock*` name prefix rule is Jest's). |
| `jest.isolateModules` (4) | None. Use `vi.resetModules()` then `await import( './Run' )` | Callback becomes async. `resetModules` clears the whole registry, not a scoped one, and "Top-level imports cannot be re-evaluated". It does not reset the mocks registry. |
| `moduleNameMapper` `^electron$`, `^@sentry/electron/renderer$` | `test.alias` (or `resolve.alias`) with absolute paths | Applies only to `import` from inlined code (the repo's own source). "Vitest does not support aliasing `require` calls." A `require( 'electron' )` inside a `node_modules` package gets the real package. |
| `moduleNameMapper` `\.css$` | Nothing | `test.css` default: "CSS files will be replaced with empty strings". `jest/fileMock.js` can go. |
| `setupFiles` | `test.setupFiles` | Runs before each test file, in the test process. Paths resolve from `root`. |
| `setupFilesAfterEnv` | `test.setupFiles` (same list, after `setup.js`) | One list covers both. Hooks such as `beforeEach` are allowed there. "Vitest will ignore any exports from these files". |
| `transform` (babel-jest) | Nothing. Vite transforms `ts`, `jsx`, `tsx` with Oxc | Babel and `jest/babelTransform.js` go. `.js` files are not JSX-transformed by default; the four `.test.js` files that render use `createElement`, not JSX, and become `.tsx`/`.ts` anyway. |
| `transformIgnorePatterns` for `d3-array` | Nothing | `node_modules` is externalized and loaded by Node. `d3-array@3.2.5` and `internmap@2` are `"type": "module"`, which Node 22 loads natively. Escape hatch: `server.deps.inline`. |
| `testEnvironment: 'jsdom'` | `test.environment: 'jsdom'` plus the `jsdom` package | Default is `node`. Vitest puts jsdom's window keys onto the Node global, so Node globals stay visible. Per-file override: `// @vitest-environment node`. |
| `roots`, `testMatch` | `test.include` (or `test.dir`) | Default include is `**/*.{test,spec}.?(c|m)[jt]s?(x)` from the root. Scope it so `e2e/` Playwright specs and `src/preload-proofs/` are not picked up. |
| `require()` in 14 test files | Static `import`, or `await import()`; `createRequire( import.meta.url )` where a true CommonJS load is wanted | `require`, `__dirname`, `__filename` exist in the module runner. But "Calls to `require()` always use Node.js directly and leave the module runner": no Vite transform, no alias, no mocks, no TypeScript, and a file both imported and required can evaluate twice. |
| `beforeEach( () => stubBridge() )` (2) | `beforeEach( () => { stubBridge(); } )` | A value returned from `beforeEach`/`beforeAll` is treated as a teardown function. `stubBridge` returns an object. |
| Hook order | `sequence.hooks: 'list'` if order matters | Jest runs hooks in sequence; Vitest's default is a stack. |
| `it.each`, `expect.any`, `expect.objectContaining`, `mockImplementation`, `mockResolvedValue(Once)`, `mockRejectedValue`, `mockClear`, `mockRestore` | Same names | No documented difference. |

Sources: [Migrating from Jest](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/guide/migration/jest.md), [vi API](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/api/vi.md), [alias](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/alias.md), [css](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/css.md), [setupFiles](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/setupfiles.md), [globals](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/globals.md), [environment](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/environment.md), [include](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/include.md), [server.deps](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/config/server.md), [Common errors: CommonJS](https://github.com/vitest-dev/vitest/blob/v5.1.1/docs/guide/common-errors.md), [Vite 8 shared options: `oxc`](https://vite.dev/config/shared-options.html), [`moduleEvaluator.ts`](https://github.com/vitest-dev/vitest/blob/v5.1.1/packages/vitest/src/runtime/moduleRunner/moduleEvaluator.ts) (CommonJS variables), [`env/utils.ts`](https://github.com/vitest-dev/vitest/blob/v5.1.1/packages/vitest/src/integrations/env/utils.ts) (`populateGlobal`).

## What `require()` means for the 14 files

- **Must change (5 files).** `getActiveState.test.js` mocks with `jest.mock` and then `require`s TypeScript source: use `vi.mock` plus static `import`. `host.test.js`, `provideStateReport.test.js`, `bootstrap.test.js`, `alignmentStore.test.js` `require` TypeScript or ESM source inside `jest.isolateModules`: use `vi.resetModules()` plus `await import()`.
- **Works, but convert with the TypeScript rename (5 files).** `typecheckBaseline`, `preload`, `pageNodeImports`, `sourceMaps`, `pack` `require` Node built-ins, `package.json`, `app-builder-lib`, and the CommonJS `scripts/typecheck-baseline.js`. Node can load all of these directly.
- **Needs a choice (4 files).** `e2e/helpers/*.test.js` `require` CommonJS helpers that Playwright also loads, and those helpers are out of scope for conversion. A named `import` from a CommonJS source file through the module runner is "not fully supported". `createRequire( import.meta.url )` keeps the native load.

## Vitest 5 defaults that differ from Jest 27

- **`clearMocks` is `true`.** Vitest calls `vi.clearAllMocks()` before every test. Jest's default is `false`. Set `clearMocks: false` to keep today's behaviour, then decide separately.
- **`vi.mock` must be top-level.** A nested call throws.
- **Unawaited async assertions fail the test.** `expect( p ).resolves…` without `await` now fails.
- **Pool is `forks`, `isolate` is `true`.** Each test file gets a fresh module registry, as under Jest.
- **Test names join with ` > `.** This affects `-t` patterns only.

## Open risks

1. **`electron` alias does not reach `node_modules`.** `src/main/updates.ts` imports `electron-log`, and `src/main/appStore.ts` imports `electron-store`. Both are CommonJS packages that `require( 'electron' )` themselves. Under Jest the mapper covered them. Under Vitest they get the real `electron` package. `updates.test.js` is the first place this can show.
2. **Node globals leak into jsdom tests.** `docs/agents/checks.md` says Node's `setImmediate` must stay off the shared setup because React's scheduler prefers it and races jsdom teardown. Vitest's jsdom environment keeps Node's globals, so `setImmediate` is present in every test.
3. **jsdom 16 to 29.** Page-paint and dialog tests may hit changed DOM behaviour.
4. **`mobxActionWarning` is both a setup file and an import.** `src/` imports `actionWarnings` from it. The test must get the same module instance the setup file ran in.
5. **Node 22.18 pins jsdom below 30.** Yarn 1 checks `engines` on install.
6. **Test count.** The map says 67 files under `src/`. `rg --files src -g "*.test.*"` finds 62, all `.js`, plus 4 in `e2e/helpers`.

## Not verified

- Nothing was installed or run. No test has been executed under Vitest.
- That Oxc in Vite 8.3.7 reads `jsx: "react-jsx"` and `useDefineForClassFields` from `tsconfig.json`. The Vite page says it discovers the closest `tsconfig.json` but does not list the fields. If it does not, add `@vitejs/plugin-react` (already installed) or set `oxc.jsx` in the Vitest config. MobX stores depend on define-semantics class fields.
- Risks 1, 2 and 4 above. They are read from docs and source, not observed.
- That Yarn 1 fails an install on an `engines` mismatch. This is from memory, not from the Yarn docs.
- Jest 27's own `restoreAllMocks` semantics were not re-read; only the Vitest side is cited.
- The electron-vite docs were read through a page summary, not the raw source.
