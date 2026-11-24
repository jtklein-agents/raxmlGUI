# electron-log 4 to 5

Ticket: #362. Researched 2026-11-24 against electron-log 4.4.8 (installed) and 5.4.4 (latest on npm).

Sources:

- [M] Migration guide: https://github.com/megahertz/electron-log/blob/master/docs/migration.md
- [C] Changelog: https://github.com/megahertz/electron-log/blob/master/CHANGELOG.md
- [I] Initialize doc: https://github.com/megahertz/electron-log/blob/master/docs/initialize.md
- [S4] v4.4.8 source: `node_modules/electron-log/src/transports/file/{index,variables}.js`, `src/electronApi.js`
- [S5] v5.4.4 source (npm tarball): `src/index.js`, `src/main/ElectronExternalApi.js`, `src/node/NodeExternalApi.js`, `src/node/transports/file/index.js`, `src/main/initialize.js`, `package.json`

## How raxmlGUI uses electron-log today

- `src/main/index.ts`: `import log from 'electron-log'`, `autoUpdater.logger = log`, `log.transports.file.level = 'info'`, `log.info(...)`.
- `src/main/updates.ts`: `import log from 'electron-log'`, `log.info(...)` only.
- `src/pack.test.ts`: asserts `node_modules/electron-log/package.json` is packed (main externalizes deps; only the preload sets `externalizeDeps: false`).
- No renderer or preload use anywhere in `src`.

## Findings

### API changes that touch this code: none required

- v5 needs Node 14+ / Electron 13+ [M]. The app is on Electron 45.
- Renames in v5: `file.resolvePath` to `resolvePathFn`, `file.archiveLog` to `archiveLogFn`, `remote.onError`/`transformBody` replaced, `log.catchErrors` to `log.errorHandler.startCatching`, `log.create(id)` to `log.create({ logId })` [M][C]. raxmlGUI uses none of these.
- `log.info` and `log.transports.file.level` are unchanged [S5 `src/node/transports/file/index.js`].
- The bare `'electron-log'` import still works in main: `src/index.js` picks `./main` when `process.type === 'browser'` [S5]. The docs now recommend `import log from 'electron-log/main'` [M][I]; `package.json` `exports` maps `./main` to `./main.js` [S5]. Switching is optional but clearer.
- `autoUpdater.logger = log` keeps working: the v5 main logger has `info`/`warn`/`error`/`debug`. Confirm with `yarn typecheck` after the bump.

### Default log file path: unchanged, so a 2.0.19 user keeps their location

Both versions resolve to `path.join(libraryDefaultDir, fileName)`, with `fileName` `main.log` for the main process [S4 `file/index.js` `resolvePath`; S5 `file/index.js` `resolvePathFn`].

| OS | v4 `libraryDefaultDir` [S4 `variables.js`] | v5 `getAppLogPath` [S5 `NodeExternalApi.js`] |
|---|---|---|
| macOS | `~/Library/Logs/{appName}` | `~/Library/Logs/{appName}` |
| Windows | `getUserData()/logs`, i.e. `app.getPath('userData')/logs` = `%APPDATA%\{appName}\logs` | `app.getPath('userData')/logs` [S5 `ElectronExternalApi.getAppUserDataPath`] |
| Linux | same, `~/.config/{appName}/logs` | same |

`appName` is `app.name` in both [S4 `electronApi.getName`; S5 `ElectronExternalApi.getAppName`], i.e. productName `raxmlGUI`. So the file stays `~/Library/Logs/raxmlGUI/main.log`, `%APPDATA%\raxmlGUI\logs\main.log`, `~/.config/raxmlGUI/logs/main.log`, and v5 appends to the existing file. The last path change was v3 to v4 [M], not v4 to v5.

One v5 change that does not affect us: renderer logs now go to `main.log` too, not `renderer.log` [C 5.0.0]. raxmlGUI has no renderer logging.

### Renderer/preload under the sandbox

- v5 moves all logic to main; a renderer logger only sends IPC (`__ELECTRON_LOG__`) to main [C][I].
- With `contextIsolation`/`sandbox` on (raxmlGUI sets `sandbox: true` in `src/main/pageWindowPreferences.ts`), the documented path is `log.initialize()` in main before the first window; it registers a built-in preload on the default session (`session.registerPreloadScript`, falling back to `setPreloads`) that exposes `window.__electronLog` [I][S5 `initialize.js`, `ElectronExternalApi.setPreloadFileForSessions`].
- Alternatives if renderer logging is ever wanted: `import 'electron-log/preload'` in our own preload (bundled, since the preload does not externalize deps), or send `__ELECTRON_LOG__` over IPC from the preload / `rendererBridge` [I].

### Is `initialize()` needed?

No, not for the current code. It only wires renderer-to-main logging [I]; main-process logging works without it. Call it only if a ticket adds renderer logging. Note it adds a second preload to every window's session.

### Pack check

v5 has no runtime dependencies [S5 `package.json`] and still ships `package.json` at the package root, so `src/pack.test.ts`'s assertion holds unchanged.

## Upgrade, in short

Bump `electron-log` to `^5.4.4`; optionally change both imports to `'electron-log/main'`; run `yarn typecheck`, `yarn test`, and launch once to see `main.log` grow in the old folder. No path override is needed.
