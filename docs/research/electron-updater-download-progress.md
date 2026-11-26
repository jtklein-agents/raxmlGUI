# Does electron-updater report download progress on every target

Question (#388): on `electron-updater` 6.8.12, does `download-progress` fire with usable `percent`, `transferred` and `total` on each target this repo builds (macOS zip via Squirrel.Mac, Windows NSIS, Linux AppImage), for full and differential (blockmap) downloads?

## Short answer

Yes, on all three targets, for full and differential downloads, with two conditions and some quirks:

- A `download-progress` listener must be registered **before** `downloadUpdate()` is called. Every code path attaches `onProgress` only when `listenerCount('download-progress') > 0` at download start.
- Full downloads report progress only when the response has a `Content-Length` header. GitHub release assets send one.
- Events are throttled to about one per second. A download that finishes in under a second emits only the final `percent: 100` event.
- In a differential download, `total` is the number of bytes to fetch, not the file size. Bytes copied from the old file do not count.
- If a differential download fails and falls back to a full download, progress starts again from 0 with a new `total`.
- If the update file is already in the cache, no progress events fire. `update-downloaded` fires directly.

## Versions and build

- `yarn.lock`: `electron-updater@^6.8.12` resolves to 6.8.12, `builder-util-runtime` 9.7.1. Source read from `node_modules/electron-updater/out` and `node_modules/builder-util-runtime/out`.
- `package.json` `build`: mac `dmg` + `zip` (universal), win `nsis`, linux `AppImage`, `publish.provider: github`. No `nsis` block, so electron-builder defaults apply.
- `src/main/updates.ts` sets `autoDownload = false` and calls `updater.downloadUpdate()` on consent. It registers no `download-progress` listener today, so no progress is computed today.

## Where progress comes from

### Full download (all targets)

`AppUpdater.executeDownload` (`electron-updater/out/AppUpdater.js:560-570`) builds `downloadOptions` and sets `onProgress = it => this.emit('download-progress', it)` only when a listener exists. The target's task then calls `httpExecutor.download(url, file, downloadOptions)`.

`builder-util-runtime/out/httpExecutor.js:468-471`: if `onProgress` is set and the response has `content-length`, a `ProgressCallbackTransform` is piped in with `total = Content-Length`.

`builder-util-runtime/out/ProgressCallbackTransform.js`: emits `{ total, delta, transferred, percent, bytesPerSecond }` at most once per 1000 ms while bytes flow, skipping the event when `transferred === total`. `_flush` always emits a final event with `transferred: total, percent: 100`.

### Differential download, blockmap file (macOS zip, Windows NSIS)

`AppUpdater.differentialDownloadInstaller` (`AppUpdater.js:661-745`) sets the same listener-gated `onProgress` (lines 694-695) and runs `GenericDifferentialDownloader`.

`differentialDownloader/DifferentialDownloader.js:106-120`: when `!isUseMultipleRangeRequest`, it sums the DOWNLOAD tasks into `grandTotal` and pipes a `ProgressDifferentialDownloadCallbackTransform`. `GitHubProvider.js:16` sets `isUseMultipleRangeRequest: false`, so this path applies here. (With multiple-range requests, `DataSplitter.js:88-97` reports progress instead, also against the downloaded-bytes total.)

`differentialDownloader/ProgressDifferentialDownloadCallbackTransform.js`: counts only bytes from range downloads (`beginFileCopy` stops counting), emits at most once per 1000 ms, emits after each range in `endRangeDownload`, and emits `percent: 100` in `_flush`. So `total` is the download size, which can be a small part of the update.

On any differential error, the code logs "Cannot download differentially, fallback to full download" and the target runs the full download (`AppUpdater.js:737-745`), whose progress starts at 0 with `total` = full file size.

### Differential download, embedded blockmap (Linux AppImage)

`AppImageUpdater.downloadDifferential` (`AppImageUpdater.js:50-71`) sets the listener-gated `onProgress` (lines 60-61) and runs `FileWithEmbeddedBlockMapDifferentialDownloader`, which uses the same `DifferentialDownloader` base and the same progress transform. Fallback to full download happens on Linux (`return process.platform === "linux"`).

## Per target

| Target | Full download | Differential download | Notes |
|---|---|---|---|
| macOS zip (Squirrel.Mac) | Yes (`MacUpdater.js:105`) | Yes, `differentialDownloadInstaller` (`MacUpdater.js:102`) | Differential only when a cached `update.zip` from an earlier electron-updater download exists (`MacUpdater.js:93-99`). First update after a fresh install is always full. |
| Windows NSIS | Yes (`NsisUpdater.js:50`) | Yes, `differentialDownloadInstaller` (`NsisUpdater.js:49`) | Web-installer package path has its own gated `onProgress` (`NsisUpdater.js:164-165`), but this repo builds plain `nsis`. |
| Linux AppImage | Yes (`AppImageUpdater.js:43`) | Yes, embedded blockmap (`AppImageUpdater.js:42`, `60-61`) | Needs `APPIMAGE` env var; without it the download throws `ERR_UPDATER_OLD_FILE_NOT_FOUND` before any progress. |

### macOS: the Squirrel.Mac step reports no progress, but needs none

All `download-progress` events come from electron-updater's own HTTP download. After it finishes, `MacUpdater.updateDownloaded` (`MacUpdater.js:~140-230`) starts a local proxy server on `127.0.0.1`, points `nativeUpdater.setFeedURL` at it, calls `dispatchUpdateDownloaded`, and (with `autoInstallOnAppQuit`) lets Squirrel.Mac fetch the zip from that local server. That local copy emits no `download-progress`, but it is a disk-to-disk pipe, not a network download. `update-downloaded` is emitted before Squirrel's copy starts, so `quitAndInstall` may have a short wait; that is not a progress gap.

## No target found where progress is missing, jumps, or fires only at the end

Except for the conditions above (no listener at start, no `Content-Length`, sub-second download, cached file, differential fallback restart), every target emits throttled intermediate events plus a final 100% event.

## Supporting evidence (secondary)

- electron-builder #9174, "Update download progress event is not emitted on NSIS delta updates" (closed 2025-09-19): https://github.com/electron-userland/electron-builder/issues/9174. In 6.8.12 the differential path does wire `onProgress` (`AppUpdater.js:694-695`). Most likely cause in that report: progress only fires if the listener is registered before `downloadUpdate()`.
- electron-builder #2521, "download-progress does not emit proper values (nsis-web, differentialPackage)" (closed): https://github.com/electron-userland/electron-builder/issues/2521. Historical; the web-package path now has its own `onProgress` hook.

## Implications for the progress UI

- Register `updater.on('download-progress', ...)` in `listenForUpdates`, before `downloadUpdate()` can run.
- Show `percent`, and treat a drop back to a low percent as the differential-to-full fallback, not an error.
- Show an indeterminate state until the first event arrives, because short downloads and cached files emit only a final event or none.
