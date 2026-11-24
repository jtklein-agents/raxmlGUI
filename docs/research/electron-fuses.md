# Electron Fuses for raxmlGUI

Question (#360): which Electron Fuses can electron-builder 26 set at pack time, which are safe for raxmlGUI, and do ASAR integrity / `OnlyLoadAppFromAsar` interact with the universal macOS build (`mergeASARs: false`) or the e2e launch?

Versions checked: Electron 45.2.3 (repo), electron-builder v26.0.20 source, @electron/universal 2.0.3 (pinned by app-builder-lib 26), @electron/fuses ^1.8.0 (app-builder-lib 26 dependency). The repo is on electron-builder 24.13.3, which has no `electronFuses` key; fuses arrive with the 24 to 26 upgrade.

## How electron-builder 26 sets fuses

- Config key `electronFuses` (type `FuseOptionsV1`), added in 26.0.0-alpha.2 (PR #8588). Each key is optional; keys left undefined are not written. Source: `packages/app-builder-lib/src/configuration.ts` and `platformPackager.ts` `generateFuseConfig` at v26.0.20; app-builder-lib CHANGELOG.
- Keys: `runAsNode`, `enableCookieEncryption`, `enableNodeOptionsEnvironmentVariable`, `enableNodeCliInspectArguments`, `enableEmbeddedAsarIntegrityValidation`, `onlyLoadAppFromAsar`, `loadBrowserProcessSpecificV8Snapshot`, `grantFileProtocolExtraPrivileges`, plus `resetAdHocDarwinSignature`. There is no key for Electron's ninth fuse, `wasmTrapHandlers`; it stays at its default (enabled). An `afterPack` hook can call `context.packager.addElectronFuses(context, fuseConfig)` with a raw `@electron/fuses` config to set it or to use `strictlyRequireAllFuses`.
- Order: fuses are flipped after `afterPack` and immediately before signing (`// the fuses MUST be flipped right before signing`). The `afterSign` notarize hook therefore sees the fused, signed app. `resetAdHocDarwinSignature` is not needed, per the config doc comment, because electron-builder signs right after flipping.
- Universal mac: `macPackager.doPack` packs x64 and arm64 with `disableFuses: true, disableAsarIntegrity: true`, merges them with `makeUniversalApp`, runs `afterPack` on the merged app, then flips fuses once on the universal binary and signs. So `electronFuses` works with `arch: universal`.
- ASAR integrity hash: electron-builder 26 computes it for every `.asar` in Resources (and asars in `extraResources`) and writes `ElectronAsarIntegrity` to `Info.plist` on macOS (`electronMac.ts`) and an `INTEGRITY/ElectronAsar` resource on Windows (`electronWin.ts`). For universal builds @electron/universal recomputes it on the merged app (`computeIntegrityData`) and injects it into the merged `Info.plist`.

## Per-fuse verdict for raxmlGUI

Fuse descriptions from https://www.electronjs.org/docs/latest/tutorial/fuses.

| electron-builder key | Default | What it does | Verdict for raxmlGUI |
|---|---|---|---|
| `runAsNode` | on | Honors `ELECTRON_RUN_AS_NODE`; off makes `child_process.fork` from main fail | **Safe to set `false`.** The app spawns RAxML/ModelTest binaries with `childProcess.execFile` (`src/main/processHelpers.ts`, `src/main/startRun.ts`), not `fork`. No runtime dependency (incl. electron-updater) references `ELECTRON_RUN_AS_NODE` or `fork`. |
| `enableCookieEncryption` | off | Encrypts the cookie store with OS keys; one-way | **Safe to set `true`, low value.** The app keeps no cookies of its own. On macOS it needs the app code-signed (it is). Do not flip it back once shipped. |
| `enableNodeOptionsEnvironmentVariable` | on | Honors `NODE_OPTIONS` / `NODE_EXTRA_CA_CERTS` | **Safe to set `false`.** Nothing in the app or e2e sets them. Side effect: users behind a TLS-intercepting proxy lose `NODE_EXTRA_CA_CERTS` for electron-updater's GitHub fetch (it uses Electron `net`, which follows the OS store, so likely unaffected; unverified). |
| `enableNodeCliInspectArguments` | on | Honors `--inspect*` and `SIGUSR1` inspector | **Safe to set `false` for shipped builds.** Playwright's `_electron.launch` always passes `--inspect=0` (`playwright-core/src/server/electron/electron.ts`), so a fused build cannot be driven by Playwright. Today's e2e launches the unfused `node_modules/electron` binary with `out/main/index.js` (`e2e/helpers/launchApp.js`), so it is unaffected. |
| `enableEmbeddedAsarIntegrityValidation` | off | Validates `app.asar` header hash at load; missing or wrong hash makes the app "forcefully terminate" (macOS >= Electron 16, Windows >= 30) | **Safe to set `true`** once on electron-builder 26 (it writes the hash for mac, win and the universal merge). Linux AppImage: no integrity support, fuse is inert. |
| `onlyLoadAppFromAsar` | off | Only looks for `app.asar`, not `app/` or `default_app.asar` | **Safe to set `true`.** Packaging uses the default `asar: true`. Required alongside integrity, otherwise integrity "can be bypassed via the Electron app code search path" (asar-integrity doc). |
| `loadBrowserProcessSpecificV8Snapshot` | off | Main process uses `browser_v8_context_snapshot.bin` | **Leave unset.** No custom snapshot is built. |
| `grantFileProtocolExtraPrivileges` | on | Gives `file://` pages fetch-over-file, service workers, universal access for child frames | **Leave unset (enabled) for now.** The renderer is loaded from `file://.../out/renderer/index.html` (`src/main/index.ts`) as a Vite build with `<script type="module">` assets. Whether ES-module script loading over `file://` survives with this fuse off is not covered by the docs; it needs a packaged smoke test. Turning it off is the Electron-recommended direction only after moving to a custom protocol. `src/registerServiceWorker.ts` (CRA leftover) would also stop working, but it points at a non-existent `service-worker.js` already. |
| `wasmTrapHandlers` (no electron-builder key) | on | V8 traps OOB WASM access via signal handlers | **Leave default.** Not settable via `electronFuses` in v26; no reason to change. |

Suggested config after the electron-builder 26 upgrade (mirrors the Electron Forge template defaults, `packages/template/vite/tmpl/forge.config.mts`):

```json
"electronFuses": {
  "runAsNode": false,
  "enableCookieEncryption": true,
  "enableNodeOptionsEnvironmentVariable": false,
  "enableNodeCliInspectArguments": false,
  "enableEmbeddedAsarIntegrityValidation": true,
  "onlyLoadAppFromAsar": true
}
```

## Interactions asked about

**Universal build with `mergeASARs: false`.** @electron/universal (2.0.3, `src/index.ts`) compares the two `app.asar` files. If identical (expected here: pure JS, no native modules in the asar) it keeps one `app.asar`. If they differ it renames them to `app-x64.asar` / `app-arm64.asar` and writes a shim `app.asar` (`entry-asar/has-asar.js`) that calls `app.setAppPath` to the arch asar. Either way it then hashes every asar in `Contents/Resources` and writes all of them into `ElectronAsarIntegrity`. So integrity plus `onlyLoadAppFromAsar` holds: the loaded file is still named `app.asar`, and every asar it hands off to has a hash. `x64ArchFiles: "**/static/bin/*"` concerns Mach-O files outside the asar and does not affect integrity.

**Binaries in `static/bin` and `__static`.** The RAxML binaries are `extraResources` in `Contents/Resources/static/bin`, outside the asar. No fuse touches reading files or `execFile` of non-Electron executables. ASAR integrity does not cover them; on macOS the code signature (hardened runtime, notarized) seals Resources, on Windows/Linux nothing does. Fuses neither help nor hurt here.

**electron-updater.** macOS updates go through Squirrel.Mac, which checks the new bundle's code signature; fuses are inside that signature, so an update keeps its fuses. No electron-updater code path uses `ELECTRON_RUN_AS_NODE`, `NODE_OPTIONS` or inspector flags (grep of `node_modules/electron-updater/out`). Upgrading from an unfused 2.0.19 to a fused build is a plain bundle swap. The release-candidate check in the map should run `npx @electron/fuses read --app /Applications/raxmlGUI.app` after the auto-update.

**e2e.** `e2e/helpers/launchApp.js` runs the dev Electron binary on `out/main/index.js` with `RAXMLGUI_E2E=1`. Fuses are flipped only in the packaged copy under `dist/`, so no fuse affects current e2e. If e2e ever targets the packaged app, `enableNodeCliInspectArguments: false` breaks Playwright (it needs `--inspect=0`), and `onlyLoadAppFromAsar` forbids passing a loose `out/main/index.js`.

## Open questions

1. `grantFileProtocolExtraPrivileges: false`: does the Vite renderer (ES modules over `file://`) still load? Needs a packaged smoke test, or a move to a custom protocol first.
2. Not about fuses, found while reading: `electron.vite.config.js` defines `__static` as `resolve(__dirname, 'static')` at build time, an absolute path on the build machine. In a packaged app `getStaticDir()` returns that path, so `binaryDir` would point at the CI checkout, not `process.resourcesPath/static/bin` where `extraResources` puts the binaries. Worth confirming on a packaged build; if real, it is independent of fuses.

## Sources

- Electron Fuses: https://www.electronjs.org/docs/latest/tutorial/fuses
- ASAR Integrity: https://www.electronjs.org/docs/latest/tutorial/asar-integrity
- electron-builder fuses tutorial: https://github.com/electron-userland/electron-builder/blob/v26.0.20/pages/tutorials/adding-electron-fuses.md
- electron-builder v26.0.20 source: `packages/app-builder-lib/src/{configuration.ts,platformPackager.ts,macPackager.ts,asar/integrity.ts,electron/electronMac.ts,electron/electronWin.ts,electron/ElectronFramework.ts}`
- app-builder-lib CHANGELOG (26.0.0-alpha.2, PR #8588; 26.0.12 mas fuses fix)
- @electron/universal v2.0.3: `src/index.ts`, `src/integrity.ts`, `entry-asar/has-asar.ts`
- Electron Forge vite template: `packages/template/vite/tmpl/forge.config.mts`
- Playwright: `packages/playwright-core/src/server/electron/electron.ts`
- This repo: `package.json` `build`, `electron.vite.config.js`, `src/main/processHelpers.ts`, `src/main/startRun.ts`, `src/main/index.ts`, `src/registerServiceWorker.ts`, `e2e/helpers/launchApp.js`
