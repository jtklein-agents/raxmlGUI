# Binary download without the `download` package

Ticket: #364. Question: can `scripts/download-binaries.js` drop `download` for Node 24 `fetch` plus `extract-zip`, keeping the RAxML binaries' file modes? And do `install-electron`, `electron-download`, `patch-package`, `postinstall-postinstall` still have a use?

Checked on `origin/master` at 013b630, 2026-11-24.

## Answer

- **Yes, `fetch` + `extract-zip` can replace `download`**, but `extract-zip` must be **added** as a devDependency. It is not in the tree today (`yarn why extract-zip`: "We couldn't find a match"; no `extract-zip@` entry in `yarn.lock`).
- **Modes survive.** The release zips store Unix modes, and `extract-zip` applies them.
- **`install-electron` is still needed.** **`electron-download` is used only by an orphan script.** **`patch-package` and `postinstall-postinstall` have no remaining use.**

## Current script

`scripts/download-binaries.js` calls `download(url, static/bin, { extract: true })` for `https://github.com/AntonelliLab/raxmlGUI-binaries/releases/download/v24.09.28/<Mac|Windows|Linux>.zip`. It is run by `yarn download-binaries` (`package.json`), by `.github/workflows/e2e.yaml` (`yarn download-binaries`), by `.github/workflows/build.yaml` (`npm run download-binaries`), and by the README setup steps. `download` is used nowhere else (repo grep, excluding `node_modules`).

Two existing defects that a rewrite should fix:

1. **The "already present" check never matches.** The script tests `static/bin/raxml-ng`, but every zip has a top-level `<OS>/` folder (see the zip listing below). Files land in `static/bin/Mac/raxml-ng` etc., and that is the path `electron-builder` `extraResources` reads (`"from": "static/bin/Mac"`). So the check always fails, and the script re-downloads on every run. The main checkout shows `static/bin/Mac/` and `static/bin/__MACOSX/` and no `static/bin/raxml-ng`.
2. **`__MACOSX/` resource-fork entries are extracted** into `static/bin/__MACOSX`. They are not packaged, because `extraResources` only takes `static/bin/<OS>`, but they are junk on disk.

## Do the zips carry Unix modes?

Yes. `zipinfo` on the three v24.09.28 assets shows every entry "made by" `unx` with full modes:

| Zip | Binary modes |
|---|---|
| `Mac.zip` | `raxmlHPC*`, `modeltest-ng*`, `readal`: `-rwxr-xr-x`; `raxml-ng`: `-rwxr--r--` (owner-exec only) |
| `Linux.zip` | binaries `-rwxr-xr-x`; `astral.5.7.8.jar` `-rwxrwx---`; `lib/*.jar` `-rw-rw----` |
| `Windows.zip` | `.exe`/`.dll` `-rw-rw-r--` (modes do not matter on Windows) |

So the exec bit comes from the archive. No `chmod` is needed as long as the extractor honours `externalFileAttributes`. Note that Mac `raxml-ng` is `0744`: only the owner can execute it, which is fine for a dev checkout and CI.

## `extract-zip` (2.0.1, latest)

Source: `extract-zip@2.0.1` tarball `index.js` and `readme.md` (repo github.com/maxogden/extract-zip). Deps: `yauzl ^2.10.0`, `get-stream`, `debug`. `engines.node >= 10.17.0`.

- Mode handling (`index.js` l.90–159): `mode = (entry.externalFileAttributes >> 16) & 0xFFFF`, then `createWriteStream(dest, { mode: procMode })` with `procMode = mode & 0o777`. Only when the mode is `0` does it fall back to `defaultFileMode` (default `0o644`) or `defaultDirMode` (default `0o755`). README: "Default modes are only used if no permissions are set in the zip file." The process umask still applies, as with any `createWriteStream`.
- Symlinks are recreated. Zip-slip is guarded: entries resolving outside `dir` throw (l.59–61).
- API: `await extract(zipPath, { dir })`. `dir` must be absolute. It takes a **file path**, not a buffer or stream, so the fetched body must be written to a temp file first.
- It extracts everything, including `__MACOSX/`. Delete `static/bin/__MACOSX` afterwards (or ignore it, as today).
- `yauzl@2.10.0` is already in the tree, but only as `download → decompress → decompress-unzip → yauzl`. Removing `download` drops it, and adding `extract-zip` brings it back.

For comparison, `download` today extracts through `decompress` + `decompress-unzip`. They also read the mode from `externalFileAttributes >> 16` (`decompress-unzip/index.js` l.26). `decompress` then writes with `mode & ~process.umask()` (`decompress/index.js` l.78). The behaviour is equivalent, so switching extractors does not change modes.

Do not reuse `@electron-internal/extract-zip`. It is in the tree, but only as a transitive dependency of `electron@45.2.3`. It is ESM-only, ships native `.node` bindings, and has no stated mode semantics in its `index.d.ts` (`extract(zipPath, { dir })`).

## Node 24 `fetch`

The global `fetch` (undici) has been stable since Node 21 and is present in Node 24. CI pins `node-version: 24` in all four workflows. Ref: https://nodejs.org/docs/latest-v24.x/api/globals.html#fetch. The default `redirect: 'follow'` handles the GitHub release 302 to `objects.githubusercontent.com`. Check `res.ok`, because `fetch` does not reject on 4xx/5xx. To write the body: `await pipeline(Readable.fromWeb(res.body), fs.createWriteStream(tmpZip))` (`node:stream`, `node:stream/promises`), or `fs.promises.writeFile(tmpZip, Buffer.from(await res.arrayBuffer()))` (the zips are 5–12 MB).

Sketch:

```js
const res = await fetch(binariesUrl);
if (!res.ok) throw new Error(`${res.status} ${binariesUrl}`);
const tmp = path.join(os.tmpdir(), `raxmlgui-${osName}.zip`);
await pipeline(Readable.fromWeb(res.body), createWriteStream(tmp));
await extract(tmp, { dir: path.resolve(binPath) });
await fs.rm(path.join(binPath, '__MACOSX'), { recursive: true, force: true });
```

The existence check should test `path.join(binPath, osName, ...)`.

## The four packages

| Package | Where declared | Remaining use | Verdict |
|---|---|---|---|
| `install-electron` | Not a package. It is a **bin of `electron`** (`electron@45.2.3` `package.json` `bin: { electron, install-electron: install.js }`) | `postinstall-electron: "install-electron --no"`. `electron@42.11.2` and later have **no `postinstall` script** (`npm view electron@42.11.2 scripts` is empty; `electron@41.10.7` had `postinstall: node install.js`). It was added with the Electron 42 bump in b2aa252. Without it, `node_modules/electron/dist` is never downloaded. | **Keep.** The `--no` flag is dead: `install.js` never reads `process.argv`. |
| `electron-download` ^4.1.1 (devDep) | `package.json` | Only `sentry-symbols.js` (repo root) requires it. No `package.json` script and no workflow runs that file. | Unused by the build. Remove it together with `sentry-symbols.js`, or keep both as an on-demand manual tool. That is a product decision. |
| `patch-package` ^8.0.1 (dep) | `postinstall-patch` | `patches/` was deleted in aabe50a (it held only `electron-webpack+2.8.2.patch`). Install logs "No patch files found". | **Remove** it, along with the `postinstall-patch` step. It is also wrongly in `dependencies`. |
| `postinstall-postinstall` ^2.1.0 (dep) | `package.json` | Its own `postinstall` re-runs the app's `postinstall` after `yarn remove` (README: "Yarn runs the postinstall script after `yarn`... but not after `yarn remove`"). It only exists to support `patch-package`. | **Remove** it with `patch-package`. It also makes every install run the app's `postinstall` twice. |

No `.github/workflows/*.yaml` references any of the four directly. CI reaches `install-electron` only through `yarn install` → `postinstall`.

## Sources

- `scripts/download-binaries.js`, `package.json` (`scripts`, `dependencies`, `devDependencies`, `build.*.extraResources`), `.github/workflows/{build,e2e,lint,docs-e2e}.yaml`, `sentry-symbols.js`, `README.md`, all at 013b630.
- `zipinfo` of `https://github.com/AntonelliLab/raxmlGUI-binaries/releases/download/v24.09.28/{Mac,Linux,Windows}.zip`.
- `npm pack extract-zip@2.0.1`: `index.js`, `readme.md`. `npm view extract-zip` reports 2.0.1 as the latest version, last modified 2023-03-04.
- `node_modules/decompress/index.js`, `node_modules/decompress-unzip/index.js`, `node_modules/electron/{package.json,install.js}`, `node_modules/@electron-internal/extract-zip/{package.json,index.d.ts}`, `node_modules/postinstall-postinstall/run.js`.
- `npm view electron@41.10.7 scripts`, `npm view electron@42.11.2 scripts bin`.
- `corepack yarn@1.22.22 why extract-zip` and `why yauzl`.
- `git log`: aabe50a (patches removed), b2aa252 (`postinstall-electron` added).
- Node 24 globals docs, `fetch`: https://nodejs.org/docs/latest-v24.x/api/globals.html#fetch.
