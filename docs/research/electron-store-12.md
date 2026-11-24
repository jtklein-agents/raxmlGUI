# electron-store 8 to 12

Ticket: #361. Question: what changes from `electron-store` 8 to 12 for `src/main/appStore.ts` and `src/test/electron.ts`, covering ESM-only bundling into the electron-vite main build (CommonJS output), API and option changes, the config file's location and format, and the minimum Electron and Node versions.

Checked on 2026-11-24 against electron-store 12.0.0 (released 2026-10-12, the latest tag), conf 16.0.0, electron-vite 6.0.0 and Electron 45.2.3 (the versions in this repo's lockfile).

## Short answer

- **Settings carry over, so no migration is needed.** Both 8 and 12 write to `app.getPath('userData')/config.json`, as tab-indented JSON. A file written by 8.2.0 opens in 12.0.0 and returns the same values (verified, see below).
- **The main build can stay CommonJS.** Electron 45 runs Node 24.22.2, which supports `require()` of an ES module. electron-vite's default build keeps `require("electron-store")` external, and that build loads and works. Bundling the package (`externalizeDeps.exclude`) works too.
- **The code change is the version bump.** `new Store<AppStoreSchema>()`, `.get` and `.set` do the same thing in 12. The breaking changes listed in the release notes affect only options raxmlGUI does not pass (`schema`, `migrations`, `clearInvalidConfig`, `encryptionKey`, `rootSchema`), plus `.get()` with a non-string key.
- **Minimums:** Electron 35 or later (this repo uses 45) and Node 22 or later (`engines`). Local Node is 22.18.0 and CI uses 24, so both pass the engines check that Yarn 1 runs.

## Version history, 8.2.0 to 12.0.0

| Release | What changed that could affect raxmlGUI | Source |
|---|---|---|
| electron-store 9.0.0 | Pure ESM. Needs Node 20 and Electron 30. | [release v9.0.0](https://github.com/sindresorhus/electron-store/releases/tag/v9.0.0) |
| electron-store 10.0.0 | JSON Schema draft-2020-12. This breaks only users of the `schema` option. | [release v10.0.0](https://github.com/sindresorhus/electron-store/releases/tag/v10.0.0) |
| electron-store 11.0.0 | conf 15, a large internal refactor with "no known breaking changes". | [release v11.0.0](https://github.com/sindresorhus/electron-store/releases/tag/v11.0.0), [conf v15.0.0](https://github.com/sindresorhus/conf/releases/tag/v15.0.0) |
| electron-store 12.0.0 | Needs Electron 35. Moves to conf 16 (Node 22). Changes to migrations; `.get()` throws on a non-string key; stricter validation of `name`, `encryptionKey` and dot paths. Adds the `cache` option and `.events`. Throws a clear error when not running in Electron, unless you pass an absolute `cwd`. | [release v12.0.0](https://github.com/sindresorhus/electron-store/releases/tag/v12.0.0), [conf v16.0.0](https://github.com/sindresorhus/conf/releases/tag/v16.0.0) |
| conf 11 / 12 / 13 / 14 | 11: ESM, and `projectName` is required unless you pass `cwd`. electron-store always passes `cwd`. 12: Node 18. 13: JSON Schema draft-2020-12. 14: Node 20. | [conf releases](https://github.com/sindresorhus/conf/releases) |

## Config file location and format

Compare electron-store [v8.2.0 `index.js`](https://github.com/sindresorhus/electron-store/blob/v8.2.0/index.js) with [v12.0.0 `index.js`](https://github.com/sindresorhus/electron-store/blob/v12.0.0/index.js). Both versions:
- default `name` to `'config'`,
- set `cwd` to `app.getPath('userData')`,
- set `projectVersion` from `app.getVersion()`.

conf builds the path the same way in [v10.2.0](https://github.com/sindresorhus/conf/blob/v10.2.0/source/index.ts) and [v16.0.0](https://github.com/sindresorhus/conf/blob/v16.0.0/source/index.ts) (`#resolvePath`, `#prepareOptions`): `path.resolve(cwd, configName + '.json')`. Both versions serialize with `JSON.stringify(value, undefined, '\t')`.

The release that 2.0.19 was cut from (`bd70b95`, "Update version to 2.0.19") used `electron-store` 8.2.0 / conf 10.2.0. It called `new Store()` with no options (`src/app/store/Config.js`, in the renderer at that time), and its only key was `darkMode`. Master now creates the store in main (`src/main/appStore.ts`) with the same defaults, so it reads the same file.

## Verification run (scratch project, Electron 45.2.3 / Node 24.22.2, macOS)

1. **The file carries over.** electron-store 8.2.0 wrote `{"darkMode": true}`. In the same process, `require('electron-store')` (12.0.0) returned `{ __esModule: true, default }`, and `new (ns.default)()` opened the same `config.json` path and read `darkMode === true`. A `set` from 12 wrote `{\n\t"darkMode": false\n}`, with no `__internal__` key added, and 8.2.0 read that value back. This means a downgrade also works.
2. **electron-vite 6 default main build (`externalizeDeps` on).** Output is CommonJS and keeps `require("electron-store")` external (1.6 kB). The built app ran and read and wrote the store. Vite's default interop works because Node marks the required ES module namespace with `__esModule: true`.
3. **electron-vite 6 with `build.externalizeDeps: { exclude: ['electron-store', 'conf'] }`.** Output is CommonJS, about 453 kB, with electron-store and conf inlined; ajv stays external because it is CommonJS. It ran and gave the same result.
4. `tsc --strict --moduleResolution bundler` (this repo's tsconfig setting) type-checks `import Store from 'electron-store'` and `new Store<{ darkMode?: boolean }>()` against 12.0.0's `exports.types`.

How electron-vite picks the output format, from `node_modules/electron-vite/dist/chunks/lib-*.js`: it emits `es` only when `package.json` has `"type": "module"`, and `cjs` otherwise. `build.externalizeDeps` defaults to `true`, and `externalizeDeps.exclude` bundles the packages it names. raxmlGUI has no `"type"`, so main stays CommonJS either way.

## Impact on this repo's files

- `src/main/appStore.ts`: no source change beyond the dependency bump. If schema typing is wanted later, 12's types infer `.get()` types from `schema: Schema<T>`.
- `src/test/electron.ts`: no change is required. No test imports `appStore`, `api` or `subMenuFile`, and the renderer no longer imports electron-store, which `src/preload.test.ts` asserts. The `sendSync` stub's comment ("electron-store reads this while the page store is imported") is stale: the stub returns electron-store's `{defaultCwd, appVersion}` shape, but the only `sendSync` caller now is the preload's `HOST` request. Note that electron-store 12 detects the renderer with `process.type === 'renderer'`, which is undefined under Vitest/jsdom, so if a test ever imports `appStore` it throws ("only ... main or renderer process, unless you pass an absolute `cwd`").
- `src/preload.test.ts`: its `not.toMatch(require("electron-store"))` check stays valid.
- `electron.vite.config.js`: no change is required. Bundling electron-store into main is optional.

## Open points

- **Packaged build not tested.** The externalized build was run unpackaged only. A packaged `require()` of the ESM `electron-store` and its ESM dependency tree from inside `app.asar` was not tested. The e2e run on a packaged app, or bundling via `externalizeDeps.exclude` as the preload already does, settles this.
- **`require(esm)` limit.** It fails if a module in the graph uses top-level await. No module in 12.0.0's graph does today, because it loaded. A future minor release could add one. Bundling removes this dependency on Node behavior.
