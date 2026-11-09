# electron-progressbar window flags

Question: can `electron-progressbar` open its progress window and drive the text, detail, and in-window progress with `nodeIntegration` off, `contextIsolation` on, and `sandbox` on?

No. On the versions below, each of those three flags is enough on its own to leave `require` undefined in the page. The library's page starts with `require('electron')` and then subscribes to the IPC channels that fill the window. With any one of the three flags set that way, that script does not finish, and those channels have no listener in the page. The `BrowserWindow` is still created and the data URL is still loaded.

This note records what the library source, Electron 45.2.3, and this repo's call site say. It does not choose what this repo keeps.

## Versions read

This repo's `package.json` depends on `electron-progressbar` `^2.2.1` and `electron` `^45.2.3`. `yarn.lock` resolves those to `electron-progressbar` 2.2.1 and `electron` 45.2.3. The npm registry's `latest` tag for `electron-progressbar` is 2.2.1, and 2.2.1 is the last version the registry lists. The registry metadata for 2.2.1 records `gitHead` `e56a6344ac95f622757afbb98c7f8e9d9b05ede0`, which is the `v2.2.1` tag. The package `main` is `source/index.js`. The library's own `package.json` lists `electron` `^1.7.5` as a devDependency and does not declare an Electron 45 dependency. The flag behavior below is Electron 45.2.3's, read against that 2.2.1 file. (`package.json`, `yarn.lock`, [registry record for 2.2.1](https://registry.npmjs.org/electron-progressbar/2.2.1), [v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

`electron-progressbar` 2.2.1 depends on `extend` `^3.0.1`. This repo's lockfile resolves that to `extend` 3.0.2. (`yarn.lock`, [extend 3.0.2 `index.js`](https://github.com/justmoon/node-extend/blob/v3.0.2/index.js))

## Defaults, and how caller `webPreferences` combine

The library builds one options object with a deep merge:

```js
let options = extend(true, {}, this._defaultOptions, originalOptions);
```

`extend(true, target, ...sources)` walks nested plain objects and copies each source key onto the target. A source value overwrites the target key when the source value is not `undefined`. `false` overwrites `true`. Keys present only on the default object stay. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js), [extend 3.0.2](https://github.com/justmoon/node-extend/blob/v3.0.2/index.js))

The default `browserWindow.webPreferences` are:

```js
webPreferences: {
  nodeIntegration: true,
  contextIsolation: false,
}
```

`sandbox` is not a default key. The rest of the default `browserWindow` is `parent: null`, `modal: true`, `resizable: false`, `closable: false`, `minimizable: false`, `maximizable: false`, `width: 500`, `height: 170`. A caller object `browserWindow: { webPreferences: { ... } }` therefore merges into those defaults. It does not replace `webPreferences` or the rest of `browserWindow`. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

`_createWindow` then does `new BrowserWindow(this._options.browserWindow)`, or `new this._options.remoteWindow(...)` when `remoteWindow` is set. `remoteWindow` is a constructor the caller supplies. The library does not use Electron's `remote` module. This repo's call site does not set `remoteWindow`. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

On Electron 45.2.3 the documented `webPreferences` defaults are `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true`. `sandbox` has defaulted to true since Electron 20. Context isolation has been enabled by default since Electron 12. The same page says the sandbox is disabled automatically when `nodeIntegration` is `true`. The implementation does that only when the `sandbox` key is absent: if the key is present, that boolean is stored as `sandboxed`; if it is absent, `sandboxed` is set to the inverse of `nodeIntegration` (or `nodeIntegrationInWorker`). An explicit `sandbox: true` stays on when `nodeIntegration` is also `true`. ([WebPreferences at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/structures/web-preferences.md), [`RendererProcessPreferences::From` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/browser/web_contents_preferences.cc), [Process Sandboxing at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/tutorial/sandbox.md), [Context Isolation at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/tutorial/context-isolation.md))

Passing all three strict flags through `browserWindow.webPreferences` therefore yields `nodeIntegration: false`, `contextIsolation: true`, and `sandbox: true` after the merge. The library does not reject that combination. It passes the object to `BrowserWindow`.

## What the page runs

The window loads one `data:text/html` document. The markup is three empty elements, `#text`, `#detail`, and `#progressBarContainer`, plus one inline script. `customHTML` replaces that document when the caller sets it. This repo does not set `customHTML`, so the built-in document is the one that loads. The library does not set `webPreferences.preload`. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

The inline script's first statement is:

```js
const { ipcRenderer } = require('electron');
```

After that it uses DOM APIs: `document.querySelector`, `document.createElement`, `setAttribute`, `appendChild`, `innerHTML`, `classList`, and `window.requestAnimationFrame`. The script does not read `process`, `remote`, `module`, or other Node globals. `require('electron')` is the only Node API in the page. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

The same script is the only subscriber. It listens for `CREATE_PROGRESS_BAR`, `SET_PROGRESS`, `SET_TEXT`, `SET_COMPLETED`, and `SET_DETAIL`. `CREATE_PROGRESS_BAR` creates either a `<progress>` element or an indeterminate `<div>`. The other channels write the values that a `requestAnimationFrame` loop copies into the DOM. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

## How the main process updates text, detail, and progress

The main process does not call `executeJavaScript`, `executeJavaScriptInIsolatedWorld`, or the `remote` module. The `webContents` calls in the library are `loadURL`, `openDevTools` (only when `debug` is true), `insertCSS`, and `send`. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

On `did-finish-load` the library assigns `text` and `detail` when those options are not `null`, calls `insertCSS` with the parsed style, and sends `CREATE_PROGRESS_BAR`. Later writes go through the setters and `setCompleted`:

| Call | What it sends |
| --- | --- |
| `text` setter | `SET_TEXT` |
| `detail` setter | `SET_DETAIL` |
| `value` setter | `SET_PROGRESS` |
| `setCompleted` | `SET_PROGRESS` only when the bar is determinate, then `SET_COMPLETED` |

`webContents.send` delivers a channel and structured-cloneable arguments to the renderer. `ipcRenderer.on` is how a renderer subscribes to that channel. Electron's `ipcRenderer` page says that, with context isolation enabled, that API is called from a preload script and exposed to the page with `contextBridge`. This library has no preload and does not call `contextBridge`. ([`contents.send` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/web-contents.md), [`ipcRenderer` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/ipc-renderer.md))

`insertCSS` injects CSS from the main process into the loaded page. `loadURL` loads the data URL. `did-finish-load` is the navigation-finished event. Those three do not go through `require` in the page. ([`contents.insertCSS`, `contents.loadURL`, and `did-finish-load` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/web-contents.md))

Taskbar progress is separate from the in-window bar. `_updateTaskbarProgress` calls `BrowserWindow.setProgressBar` on the parent window, or on the progress window when no parent is set. For an indeterminate bar it passes `9`. Electron treats a value greater than 1 as indeterminate mode. `setProgressBar` is a main-process method. It does not use the page script. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js), [`win.setProgressBar` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/browser-window.md))

`setCompleted` sends `SET_COMPLETED`, updates the taskbar, then emits the library's own `completed` event in the main process. That event does not wait for the page to handle `SET_COMPLETED`. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

## Which flag removes `require` from the page

The page can call `require('electron')` only when all three of these hold: `nodeIntegration` is `true`, `contextIsolation` is `false`, and the renderer is not sandboxed. On Electron 45.2.3, leaving `sandbox` unset while `nodeIntegration` is `true` turns the sandbox off. Setting `sandbox: true` does not.

**`sandbox: true`.** A sandboxed renderer does not initialize a Node.js environment. Electron's sandboxed renderer client leaves `DidCreateScriptContext` immediately unless the frame has preload scripts or `webviewTag` is on. The limited preload `require` is created only when preload scripts are present, and it is in the preload environment. This library sets neither `preload` nor `webviewTag`, so that client returns before any of that exists, and the page has no `require`. An explicit `sandbox: true` takes this path even when `nodeIntegration` is `true`, because the explicit key wins over the automatic disable. ([Process Sandboxing at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/tutorial/sandbox.md), [`RendererProcessPreferences::From` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/browser/web_contents_preferences.cc), [`ElectronSandboxedRendererClient` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/renderer/electron_sandboxed_renderer_client.cc))

**`contextIsolation: true`.** For a main frame with context isolation, Electron notifies the renderer client only for the isolated world. The Node environment, including the renderer init script, is created in that world. The page runs in the main world, which does not receive it. Context isolation gives the preload and the page different `window` objects, and the Electron API is available in the preload, not in the loaded page. The renderer init assigns `global.require` only inside the world where it runs, and only when `nodeIntegration` is true. The page script does not see that binding. This still holds when `nodeIntegration` is `true` and `sandbox` is left unset, because that combination disables the sandbox and then places Node in the isolated world. ([`ShouldNotifyClient` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/renderer/electron_render_frame_observer.cc), [`lib/renderer/init.ts` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/lib/renderer/init.ts), [WebPreferences at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/structures/web-preferences.md), [Context Isolation at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/tutorial/context-isolation.md))

**`nodeIntegration: false`.** In the unsandboxed renderer, `lib/renderer/init.ts` reads the `nodeIntegration` preference and assigns `global.require` only inside `if (nodeIntegration)`. When the preference is false and context isolation is also false, the same init deletes `process`, `Buffer`, `setImmediate`, `clearImmediate`, `global`, `root`, and `GLOBAL` from the main world after preloads. It never assigns `require` in that case. An explicit `sandbox: false` keeps this unsandboxed path, so `nodeIntegration: false` still leaves the page without `require`. When `sandbox` is omitted, `nodeIntegration: false` also selects the sandboxed renderer, which has no Node environment in the page. ([`lib/renderer/init.ts` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/lib/renderer/init.ts), [`RendererProcessPreferences::From` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/browser/web_contents_preferences.cc))

With all three flags set together, the explicit `sandbox: true` selects the sandboxed renderer, and the page script's `require('electron')` does not resolve. The `ipcRenderer.on` registrations later in that script do not run. `CREATE_PROGRESS_BAR`, `SET_TEXT`, `SET_DETAIL`, `SET_PROGRESS`, and `SET_COMPLETED` have no page listener, so the text, the detail, and the in-window bar stay at the empty markup. `webContents.send` is still invoked from the main process after `did-finish-load`. `insertCSS` and `setProgressBar` still run from the main process.

The library source contains no `enableRemoteModule` setting and no `require('electron').remote` or `@electron/remote` import. Electron 45.2.3's `WebPreferences` object does not list `enableRemoteModule`. There is no `enableRemoteModule` dependency in the 2.2.1 source to satisfy. The hard dependency that is in the source is the page's `require('electron')`, which needs `contextIsolation: false` together with `nodeIntegration: true` and a renderer that is not sandboxed. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js), [WebPreferences at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/api/structures/web-preferences.md))

A `preload` path merged in through `webPreferences` does not remove the inline `require('electron')` from the built-in page. The built-in script does not call a `contextBridge` API. `customHTML` replaces the document, and the main process still updates that document only by `webContents.send` on the same channels. ([v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

## This repo's call site

`src/main/index.js` at `f6efb12` (`origin/master`) constructs the progress window when the user accepts an available update:

```js
progressBar = new ProgressBar({
  text: 'Downloading the update for the app',
  browserWindow: {
    webPreferences: {
      nodeIntegration: true,
    },
  },
});
```

The merged `webPreferences` are the library default plus that one key: `nodeIntegration: true`, `contextIsolation: false`, and no `sandbox` key. On Electron 45.2.3 an omitted `sandbox` with `nodeIntegration: true` disables the sandbox. That is the combination in which the unsandboxed renderer assigns `require` on the page. The call site does not pass `nodeIntegration: false`, `contextIsolation: true`, or `sandbox: true`.

The bar is indeterminate (`indeterminate` defaults to `true`). The call site sets `text` at construction, sets `detail` in the library's `completed` listener, and calls `setCompleted()` from `autoUpdater`'s `update-downloaded` handler. It does not set `value`. The channels that listener path uses are `SET_TEXT`, `CREATE_PROGRESS_BAR`, `SET_COMPLETED`, and `SET_DETAIL`. `SET_PROGRESS` is not sent for an indeterminate bar. (`src/main/index.js`, [v2.2.1 `source/index.js`](https://github.com/AndersonMamede/electron-progressbar/blob/v2.2.1/source/index.js))

This repo's JavaScript has no `app.enableSandbox()` call. Electron 45.2.3's `app.enableSandbox()` forces the sandboxed renderer for every window, including one whose own `sandbox` preference is false. `WebContentsPreferences::IsSandboxed` returns true when the process was started with that switch. ([Process Sandboxing at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/docs/tutorial/sandbox.md), [`WebContentsPreferences::IsSandboxed` at v45.2.3](https://github.com/electron/electron/blob/v45.2.3/shell/browser/web_contents_preferences.cc))

## What a later decision has to take as given

- The three flags together do not drive the in-window text, detail, or progress element. Each flag breaks that page script on its own. The working combination on Electron 45.2.3 is `nodeIntegration: true`, `contextIsolation: false`, and sandbox left off (omitted while `nodeIntegration` is `true`, or set to `false`).
- Explicit `sandbox: true` stays on even when `nodeIntegration` is `true`. The automatic sandbox disable applies only when `sandbox` is omitted.
- `electron-progressbar` 2.2.1 is the last version on the registry. The `^2.2.1` range does not include a later release with a different page.
- The main-process `completed` event and `setProgressBar` still run when the page script does not. The data URL still loads. The failure is the page's missing `ipcRenderer` listeners, not `BrowserWindow` construction.
