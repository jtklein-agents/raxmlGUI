# electron-builder 24.13 to 26.x for this build config

Question (#358): what breaks or changes when `electron-builder` goes from `^24.13.3` to 26.x for the `build` block in `package.json`, and does the published update feed stay readable by electron-updater 6.8 in an installed 2.0.19?

Researched 2026-11-24. Current releases: `electron-builder` 26.18.1 (`v26` dist-tag; `latest` is 26.18.0), 27.0.0-alpha.15 on `next`. `electron-updater` 6.8.12 is the v26-line updater, the same version this repo already pins.

## Answer

No config key in our `build` block is removed or renamed in 26. The upgrade is a version bump plus a verification build. Three things need care:

1. **Pin at least 26.15.4; take 26.18.1.** 26.15.0 upgraded the bundled 7-Zip, which dereferenced symlinks in `zip` targets. That corrupted `.framework` bundles in the mac zip, and Squirrel.Mac rejected the update. 26.15.2 (#9847) and 26.15.4 (#9921) fixed it. The mac zip is the file auto-update installs.
2. **Notarization stays with our `afterSign` hook,** but a future env rename could notarize twice. See "afterSign and notarization".
3. **Node module collection was rewritten** (26.0.0 #8562, 26.15.0 #9828). Compare the `app.asar` contents of a 24 build and a 26 build once.

The update feed format and file names do not change. electron-updater 6.8.12 reads a 26 feed the same way it reads a 24 feed.

## Per config item

| Item in `package.json` `build` | Change in 25/26 | Effect here |
|---|---|---|
| `mac.target` universal `dmg` + `zip`, `mergeASARs: false`, `x64ArchFiles: "**/static/bin/*"` | `@electron/universal` 1.5.1 → 2.0.3. 2.0.0's only breaking change is Node ≥ 16. app-builder-lib v26 still passes `mergeASARs` (`?? true`, so `false` is kept) and `x64ArchFiles` straight to `makeUniversalApp`. 26.0.0 #8799: fuses are applied only to the combined universal app. | None expected. |
| Per-platform `extraResources` (`static/bin/<OS>` → `static/bin`, mac example files with `filter`) | No change listed in the 25 or 26 changelogs. 26.0.0 #8805 adds ASAR files found in `extraResources` to the integrity hash. We ship no asar there. | None expected. |
| `afterSign: ./scripts/notarize.js` | Unchanged since 24.0.0 (#7388): the hook runs only after codesigning, and otherwise logs `skipping "afterSign" hook as no signing occurred`. A CJS `exports.default` hook still loads. | None. `electron-pack` (`mac.identity=null`) skips it, as on 24. |
| Built-in notarization | Runs after signing when `APPLE_ID`/`APPLE_APP_SPECIFIC_PASSWORD`/`APPLE_TEAM_ID`, `APPLE_API_KEY*`, or `APPLE_KEYCHAIN_PROFILE` is set and `mac.notarize` is not `false`. Otherwise it logs "skipped macOS notarization". 26.0.0 #8582 removed the deprecated `mac.notarize` object options; env vars are the only input now. | CI sets `APPLEID`/`APPLEIDPASS`/`APPLEIDTEAM`, so the built-in step is skipped and our hook notarizes, as now. |
| `install-app-deps` (postinstall) | CLI still in v26 (`packages/electron-builder/src/cli/install-app-deps.ts`). Native rebuild moved to `@electron/rebuild` (25.0.0 #8112/#8140). 26.15.0 #9828 removed app-builder-bin's rebuild; `nativeRebuilder: "legacy"` now uses `@electron/rebuild` sequential mode. `@electron/rebuild` ^4.2.1 needs Node ≥ 22.12. | No native production dependencies in `dependencies`, so it stays a near no-op. Node is 24 in CI and 22.18 locally, both fine. Every `yarn install` now needs Node ≥ 22.12. |
| `files` exclusions, production `node_modules` | 26.0.0 #8562 added a new node-module collector; 26.15.0 replaced app-builder-bin `node-dep-tree` with TypeScript. Many yarn-classic hoisting fixes followed (#9401, #9810, …). | Main risk. Diff `npx asar list` of `app.asar` from a 24 build and a 26 build. |
| `win` nsis, `linux` AppImage | 26.0.0 #8582 moved Windows signing options to `win.signtoolOptions`. We set no Windows signing options. | None. |
| `publish: { provider: "github" }` | Default release type is still `draft`. 26.0.20 #9216 deprecates `vPrefixedTagName` in favour of `tagNamePrefix`; the default still tags `v<version>`. 26.9.0 #9581 adds optional `releaseBody`/`releaseName`. | None. |
| CI `samuelmeuli/action-electron-builder@v1` | It runs the repo's installed `electron-builder`. | Picks up the bump. |

## Update feed and electron-updater 6.8

- **File names are unchanged.** `getUpdateInfoFileName` gives `latest.yml` (Windows) and `latest-<platform>.yml` (mac, linux). `getArchPrefixForUpdateFile` is byte-identical in v24.13.3 and release/v26. Universal and x64 add no suffix, so the mac feed stays `latest-mac.yml`. The GitHub provider writes only the current channel (`latest`).
- **Content is unchanged.** The feed still has `version`, a `files[]` list of `url`/`sha512`/`size`, top-level `path`/`sha512` for old updaters, and `releaseDate`. The zip still sorts first, so `path` points to the zip (updateInfoBuilder.ts, release/v26). The v2.0.18 `latest-mac.yml` on GitHub (built with 24.13.3) has exactly this shape.
- **Updater side:** in 6.8.12, `MacUpdater` picks the `zip` entry. `filterFilesForArch` drops only files named `arm64`, so `raxmlGUI-<v>-universal-mac.zip` is chosen on both Intel and Apple Silicon. Squirrel.Mac then checks the unpacked app's signature. That check is why the 26.15.0–26.15.3 zip symlink bug broke updates, and why the pin must be ≥ 26.15.4.
- Installed 2.0.18 ships `electron-updater` ^5.2.4 (package.json at tag v2.0.18). It reads the same file names and fields, so it also keeps updating. Not separately tested.

## Verify before merging the bump

1. `yarn build-mac` with 24.13.3 and again with 26.18.1. Diff `npx asar list dist/mac-universal/raxmlGUI.app/Contents/Resources/app.asar`, the `Contents/Resources/static/bin` contents, and the artifact names in `dist/`.
2. Check the 26 zip: `ditto -x -k raxmlGUI-*-universal-mac.zip /tmp/x && codesign --verify --deep --strict /tmp/x/raxmlGUI.app`.
3. Compare `dist/latest-mac.yml` keys with the v2.0.18 release asset.

## Sources

- app-builder-lib CHANGELOG, release/v26: https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/CHANGELOG.md (26.0.0 major changes #8582/#8572/#8562; 25.0.0 #8112/#8140/#8159; 26.15.0 #9828; 26.15.2 #9847; 26.15.4 #9921; 26.0.20 #9216; 26.0.0 #8799/#8805)
- macPackager.ts (universal merge, afterSign, notarize call): https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/src/macPackager.ts
- MacTargetHelper.ts `getNotarizeOptions`/`notarizeIfProvided`: https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/src/mac/MacTargetHelper.ts
- updateInfoBuilder.ts (v26 vs v24.13.3): https://github.com/electron-userland/electron-builder/blob/release/v26/packages/app-builder-lib/src/publish/updateInfoBuilder.ts and https://github.com/electron-userland/electron-builder/blob/v24.13.3/packages/app-builder-lib/src/publish/updateInfoBuilder.ts
- gitHubPublisher.ts (draft default): https://github.com/electron-userland/electron-builder/blob/release/v26/packages/electron-publish/src/gitHubPublisher.ts
- electron-updater MacUpdater.ts: https://github.com/electron-userland/electron-builder/blob/release/v26/packages/electron-updater/src/MacUpdater.ts
- app-builder-lib v26 package.json (`@electron/universal` 2.0.3, `@electron/rebuild` ^4.2.1); `@electron/rebuild` 4.2.1 engines on the npm registry
- @electron/universal v2.0.0 release notes: https://github.com/electron/universal/releases/tag/v2.0.0
- v2.0.18 release assets: https://github.com/AntonelliLab/raxmlGUI/releases/tag/v2.0.18
