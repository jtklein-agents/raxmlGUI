# `@sentry/electron` 4 to 8

Research for #363. Checked 2026-11-24 against `@sentry/electron` 8.4.0 (latest release, 2026-11-10) and the repo at `origin/master` (013b630).

## Question

What changes from `@sentry/electron` 4 to 8 for `src/main/api.ts`, `src/main/startRun.ts` and `src/app/index.tsx` with a sandboxed, context-isolated page: init in main/renderer/preload, IPC mode, required preload wiring, minimum Electron, and compatibility with `@sentry/bundler-plugins` 11.12 release naming (`raxmlGUI@<version>`) in `electron.vite.config.js`?

## Answer

| Topic | Today (4.24.0 installed, `^4.0.2`) | 8.x |
|---|---|---|
| Minimum Electron | 4.x | **35.0.0**; main `init` throws below that [1][2]. Repo is on Electron `^45.2.3`: fine. |
| Imports | `@sentry/electron/main`, `@sentry/electron/renderer` | Same subpaths. The bare `@sentry/electron` root import throws since v5 [3]. Repo already uses the subpaths. |
| Main `init` (`src/main/api.ts`) | `{ dsn, maxValueLength: 2000 }` | Same call works. `maxValueLength` still exists in `@sentry/core` options [9]. |
| `captureException` (`src/main/startRun.ts`) | `Sentry.captureException( err )` | Unchanged API [4]. No edit needed. |
| Renderer `init` (`src/app/index.tsx`) | `Sentry.init( { dsn } )` | `dsn` and `release` on the renderer options are `@deprecated`; "passing `dsn`, `release` or `environment` to renderer `init` will have no effect" [5][6]. Call `Sentry.init()` with no DSN; events go through main. |
| IPC mode | default `IPCMode.Both` | default still `IPCMode.Both`, namespace `sentry-ipc` (configurable via `ipcNamespace`, added 7.x) [2][7]. |
| Preload wiring | auto-injected | Still auto-injected by `preloadInjectionIntegration` via `session.registerPreloadScript({ type: 'frame' })` on `defaultSession` [8]. If injection fails (main bundled so `require.resolve` of `preload/default.js` fails), the renderer falls back to the custom `sentry-ipc://` protocol with `fetch` [7]. No app preload change is required. |
| Data collection | v4 always set `user.ip_address: '{{auto}}'` [11] | v6 made IP opt-in via `sendDefaultPii` [3]; v8 replaces that with `dataCollection`, which collects more by default, IP included. Opt out with `dataCollection: { userInfo: false }` [1][10]. IP matches v4; other categories (headers, bodies) are wider but mostly apply to HTTP instrumentation this app does not use. **Decision needed.** |
| Tracing | n/a (not used) | Span streaming default, OTel setup opt-in [1]. Not used here, no effect. |
| Release name | default `${app.name with \W→-}@${app.getVersion()}` | Same function, same default [2][11]. |

### Sandboxed, context-isolated page

`pageWindowPreferences` sets `sandbox: true`, `contextIsolation: true`, `nodeIntegration: false` and passes the app preload `out/preload/index.js`.

- Sentry's own preload (`preload/default.js`) states it "may be used with sandbox mode enabled" and calls `contextBridge.exposeInMainWorld('__SENTRY_IPC__', …)` with only `ipcRenderer` [12]. It runs as a second session-registered preload next to the app preload; it does not touch `rendererBridge`.
- It injects only when `@sentry/electron` resolves on disk from the main bundle. electron-vite 6 externalizes `main` deps by default (`build.externalizeDeps`), and this config does not override it for `main`, so `out/main/index.js` `require`s `@sentry/electron/main` from `node_modules` in the asar, and injection should work. The `preload` build sets `externalizeDeps: false`, which only matters if the app preload imports Sentry.
- Alternative (explicit) wiring: `import '@sentry/electron/preload'` at the top of `src/preload/index.ts`. Because the preload is bundled (`externalizeDeps: false`), this inlines `hookupIpc()`. It is only needed if auto-injection fails.
- Fallback: protocol mode (`IPCMode.Protocol`) needs no preload at all; renderer `fetch`es `sentry-ipc://…` [7].
- Errors thrown inside the app preload itself are not captured unless Sentry is initialised there [5]. The app preload is thin, so this is likely acceptable.

### Release naming vs `@sentry/bundler-plugins` 11.12

- `electron.vite.config.js` uploads maps with `release.name: \`raxmlGUI@${version}\`` from `package.json`.
- The SDK sets `release: getDefaultReleaseName()` before spreading user options, so main events use `app.name.replace(/\W/g, '-') + '@' + app.getVersion()` [2][11]. Electron's `app.name` prefers `productName` over `name` [13]. `package.json` has `productName: "raxmlGUI"`, `version: "2.0.19"`, so the default is `raxmlGUI@2.0.19`. That matches the upload name.
- Renderer events are forwarded through main, and renderer `release` has no effect [5], so one release covers both bundles.
- The match is implicit: a `productName` change or a non-word character in it would split the releases. Setting `release: \`raxmlGUI@${app.getVersion()}\`` in main `init` makes it explicit. Optional.

## Required edits for the upgrade

1. `package.json`: `@sentry/electron` `^4.0.2` → `^8.4.0`. 8.x depends on `@sentry/core`/`@sentry/node` 11.x [14]; `@sentry/node-native` is an optional peer and is not needed.
2. `src/app/index.tsx`: drop `dsn` from renderer `Sentry.init`.
3. `src/main/api.ts`: decide on `dataCollection` (keep v4 privacy with `dataCollection: { userInfo: false }`). Optionally set an explicit `release`.
4. `src/main/startRun.ts`: no change.
5. `src/test/sentry.ts` stub and the `vitest.config.mjs` alias: unchanged (renderer `init` still exists).
6. Verify in a packaged build with `debug: true` that the log does not say "The preload script could not be injected automatically" [8], and that a renderer error arrives.

## Open questions

- Privacy default: accept v8's IP collection or set `dataCollection: { userInfo: false }`?
- Preload wiring: rely on auto-injection (default, `IPCMode.Both`), import `@sentry/electron/preload` in the app preload, or switch to `IPCMode.Protocol` to avoid a second preload?
- Pin `release` explicitly in main, or keep relying on `productName`?

## Sources

1. getsentry/sentry-electron `MIGRATION.md`, "Upgrading from 7.x to 8.x": https://github.com/getsentry/sentry-electron/blob/master/MIGRATION.md
2. `src/main/sdk.ts` (`init`: Electron < 35 throws; defaults `ipcMode: IPCMode.Both`, `ipcNamespace: 'sentry-ipc'`, `release: getDefaultReleaseName()`): https://github.com/getsentry/sentry-electron/blob/master/src/main/sdk.ts
3. `MIGRATION.md`, "Upgrading from 4.x to 5.x / Initializing the SDK in v5".
4. `README.md` usage: https://github.com/getsentry/sentry-electron/blob/master/README.md
5. Sentry Electron guide: https://docs.sentry.io/platforms/javascript/guides/electron/ (Electron 35.0.0 prerequisite; renderer `dsn`/`release`/`environment` no effect; preload errors with `contextIsolation`).
6. `src/renderer/sdk.ts` (`dsn`, `release` marked `@deprecated`): https://github.com/getsentry/sentry-electron/blob/master/src/renderer/sdk.ts
7. `src/common/ipc.ts` (`IPCMode`), `src/renderer/ipc.ts` (falls back to protocol + `fetch` when `__SENTRY_IPC__` is missing).
8. `src/main/integrations/preload-injection.ts`, `src/main/electron-normalize.ts` (`registerPreloadScript`).
9. getsentry/sentry-javascript `packages/core/src/types/options.ts` (`maxValueLength`).
10. getsentry/sentry-javascript `MIGRATION.md`, "Upgrading from 10.x to 11.x / `sendDefaultPii` is replaced by `dataCollection`".
11. `src/main/context.ts` `getDefaultReleaseName`; identical in installed 4.24.0 `esm/main/context.js`.
12. `src/preload/index.ts` (`hookupIpc`), `src/preload/default.ts`.
13. Electron docs, `app.name`: https://www.electronjs.org/docs/latest/api/app#appname
14. getsentry/sentry-electron `package.json` at 8.4.0; `CHANGELOG.md` 8.0.0–8.4.0.
