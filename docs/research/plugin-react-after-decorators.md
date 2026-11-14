# `@vitejs/plugin-react` past 5, once decorators are gone

Research for issue #107 (map #105). Looked up 2026-11-14 against `origin/master` at `808f33b`.
Sources are the plugin's changelog, README and source, the npm registry, Vite's docs and source, and the Babel and MobX docs. Two points have no documentation and were settled by a throwaway build; they are marked **(experiment)** and described at the end.

## Answer in brief

- Latest is **6.3.0**. Version 6 removed the `babel` option and Babel itself; the stated replacement is `@rolldown/plugin-babel` next to `react()`.
- 6.3.0 is the target. Its only required peer is `vite ^8.0.0`, which `vite ^8.3.7` satisfies. `electron-vite` 6 does not constrain the plugin.
- Decorators are **not** the only thing the Babel block does. It also compiles JSX in `.js` files, and 19 page files keep JSX in `.js`. Plain `react()` on version 6 fails on them **(experiment)**. The upgrade needs one of: rename those files to `.jsx`, keep one Babel plugin through `@rolldown/plugin-babel`, or a small transform plugin.
- Removing the Babel block changes class-field semantics in page `.js` files from assignment (`loose: true` today) to define (native fields, untouched by Vite). MobX 6 documents define as the required setting.
- Jest keeps Babel. It drops the decorator and class-properties plugins and keeps `preset-env`, `preset-typescript` and the JSX plugin.

## 1. Latest version, and what 6 changed

| Fact | Source |
| --- | --- |
| Latest is 6.3.0, published 2026-11-09. 5.2.0 and 6.0.0 were both published 2026-03-12. | [npm registry](https://registry.npmjs.org/@vitejs/plugin-react) (`npm view @vitejs/plugin-react dist-tags time`) |
| 6.0.0 "Remove Babel Related Features": "Vite 8+ can handle React Refresh Transform by Oxc and doesn't need Babel for it. With that, there are no transform applied that requires Babel. To reduce the installation size of this plugin, babel is no longer a dependency of this plugin and the related features are removed." | [CHANGELOG, 6.0.0-beta.0](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md#600-beta0-2026-03-03), [PR #1123](https://github.com/vitejs/vite-plugin-react/pull/1123) |
| Stated replacement: "If you are using Babel, you can use `@rolldown/plugin-babel` together with this plugin", that is `plugins: [react(), babel({ plugins: [...] })]`. | same changelog entry |
| 6.0.0 also dropped Vite 7 and below. | [PR #1124](https://github.com/vitejs/vite-plugin-react/pull/1124) |
| 5.2.0 depended on `@babel/core ^7.29.0`. 6.x depends only on `@rolldown/pluginutils`. `package.json` here has no direct `@babel/core`. | [5.2.0 package.json](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%405.2.0/packages/plugin-react/package.json), npm registry |
| Options in 6.3.0: `include`, `exclude`, `refreshInclude`, `refreshExclude` (6.2.0), `jsxImportSource`, `jsxRuntime`, `reactRefreshHost`, `compiler` (6.1.0, experimental). No `babel`. | [README](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/README.md), [src/index.ts](https://github.com/vitejs/vite-plugin-react/blob/2c6e0345c4ce87b6297c53333344eede7285d213/packages/plugin-react/src/index.ts#L33-L83) |
| 6.0.1 to 6.3.0 otherwise hold fixes and React Compiler work. None restores a Babel option. | [CHANGELOG](https://github.com/vitejs/vite-plugin-react/blob/main/packages/plugin-react/CHANGELOG.md) |

Vite's own position on decorators: "Currently, the Oxc transformer does not support lowering native decorators", and the documented workaround is Babel through `@rolldown/plugin-babel` or SWC ([Vite migration guide](https://vite.dev/guide/migration#javascript-transforms-by-oxc)). This is why the pin holds until the decorators are gone. `experimentalDecorators` from `tsconfig.json` is listed among options that affect the build result, for TypeScript files ([Vite features](https://vite.dev/guide/features#other-compiler-options-affecting-the-build-result)); the page store is `.js`.

## 2. Target version and peer ranges

| Package | Peer range | Here |
| --- | --- | --- |
| `@vitejs/plugin-react` 6.3.0 | `vite ^8.0.0` (required); `@rolldown/plugin-babel ^0.1.7 \|\| ^0.2.0 \|\| ^0.3.0`, `babel-plugin-react-compiler ^1.0.0`, `oxc-transform-react >=0.152.0 <0.157.0` (all optional); Node `^20.19.0 \|\| >=22.12.0` | `vite ^8.3.7`, Node 22.18.0 (`.nvmrc`) |
| `electron-vite` 6.0.0 (latest) | `vite ^6.0.0 \|\| ^7.0.0 \|\| ^8.0.0`; `@swc/core ^1.0.0` optional. No peer on any React plugin. | `electron-vite ^6.0.0` |
| `@rolldown/plugin-babel` 0.3.1 (latest) | `@babel/core ^7.29.0 \|\| ^8.0.0-rc.1`, `rolldown ^1.0.0-rc.5`; `vite ^8.0.0` optional | only if Babel stays, see section 3 |

Sources: npm registry (`npm view <pkg> peerDependencies peerDependenciesMeta engines`), [electron-vite package.json](https://github.com/alex8088/electron-vite/blob/master/package.json).

Every 6.x release needs Vite 8, so there is no reason to stop short of 6.3.0.

## 3. What replaces the Babel block

The block in `electron.vite.config.js` lists three plugins:

| Plugin | After decorators are gone |
| --- | --- |
| `@babel/plugin-proposal-decorators` `{ legacy: true }` | Not needed. |
| `@babel/plugin-proposal-class-properties` `{ loose: true }` | Not needed, but removing it changes semantics. See section 4. |
| `@babel/plugin-transform-react-jsx` `{ runtime: 'automatic' }` | **Still does work.** Something must compile JSX in `.js`. |

The JSX point, in detail:

- 19 `.js` files under `src/` contain JSX (and 7 `.tsx`). The config comment already says so: "JSX in .js is compiled here too: Vite's oxc parser does not treat .js as JSX."
- Vite applies Oxc "to `ts`, `jsx` and `tsx` files" by default ([Vite `oxc` option](https://vite.dev/config/shared-options#oxc)). In source the default filter is include `/\.(m?ts|[jt]sx)$/`, exclude `/\.js$/`, and the language passed to Oxc is taken from the file extension ([vite oxc.ts](https://github.com/vitejs/vite/blob/f898888222297aa56d6fc281c585d4d4e4d51f58/packages/vite/src/node/plugins/oxc.ts#L128-L143), [filter](https://github.com/vitejs/vite/blob/f898888222297aa56d6fc281c585d4d4e4d51f58/packages/vite/src/node/plugins/oxc.ts#L224)). `OxcOptions` omits `lang`, so the config cannot override it ([same file](https://github.com/vitejs/vite/blob/f898888222297aa56d6fc281c585d4d4e4d51f58/packages/vite/src/node/plugins/oxc.ts#L31-L41)).
- plugin-react 6 sets `oxc.jsxRefreshInclude` to its `include` (default `/\.[tj]sx?$/`), so `.js` files do reach Oxc, parsed as plain JavaScript ([src/index.ts](https://github.com/vitejs/vite-plugin-react/blob/2c6e0345c4ce87b6297c53333344eede7285d213/packages/plugin-react/src/index.ts#L85-L146)).
- **(experiment)** With plugin-react 6.3.0 and Vite 8.3.8, `plugins: [react()]` fails in build and in dev on a `.js` file with JSX: `Unexpected JSX expression … JSX syntax is disabled and should be enabled via the parser options`. Setting `oxc.include`/`oxc.exclude` to cover `.js`, setting `build.rolldownOptions.moduleTypes: { '.js': 'jsx' }`, or both, does not fix it.

Three configurations that work **(experiment: build passes, dev output has JSX compiled and Fast Refresh registration)**:

| Option | Config | Babel in the page build | Notes |
| --- | --- | --- | --- |
| A. Rename the 19 files to `.jsx` | `react()` | none | The documented default path: "`.jsx` and `.tsx` files are also supported out of the box" ([Vite features, JSX](https://vite.dev/guide/features#jsx)). The `optimizeDeps.rolldownOptions.moduleTypes` block exists for the same reason and may become removable; not verified in this repo. |
| B. Keep one Babel plugin | `react(), babel({ plugins: [['@babel/plugin-transform-react-jsx', { runtime: 'automatic' }]] })` with `babel` from `@rolldown/plugin-babel` | yes | The migration the changelog documents. Adds `@rolldown/plugin-babel` and a direct `@babel/core` dev dependency. |
| C. A small `enforce: 'pre'` plugin that calls Vite's `transformWithOxc(code, id, { lang: 'jsx', jsx: { runtime: 'automatic' } })` for page `.js` files | `react(), jsAsJsx()` | none | `transformWithOxc` is a documented Vite API ([JavaScript API](https://vite.dev/guide/api-javascript#transformwithoxc)). This recipe itself is not in any doc. |

## 4. Does anything else in the page need a Babel pass

`.babelrc` lists `@babel/preset-env` (targets node current), the decorators plugin and the class-properties plugin.

- **Who reads `.babelrc`.** Not Jest: `jest/babelTransform.js` sets `babelrc: false, configFile: false`. Not the page build: plugin-react 5 reads `.babelrc` only with `babel.babelrc: true` ([5.2.0 README](https://github.com/vitejs/vite-plugin-react/blob/plugin-react%405.2.0/packages/plugin-react/README.md#babel)), which the config does not set. The remaining candidate is ESLint: `.eslintrc.cjs` extends `react-app`, which parses with `@babel/eslint-parser` and `requireConfigFile: false` ([eslint-config-react-app base.js](https://github.com/facebook/create-react-app/blob/main/packages/eslint-config-react-app/base.js)). Whether the parser picks up `.babelrc` here, and whether lint still parses the store without it, was not verified.
- **`@babel/preset-env`.** Not needed by Vite. Vite transpiles with Oxc; `oxc.target` defaults to `esnext` in dev and `build.target` governs builds ([Vite features, target](https://vite.dev/guide/features#target)).
- **Class properties.** Vite does not transform class fields in `.js` or `.jsx`. **(experiment)** With `tsconfig.json` set to `"useDefineForClassFields": false`, as here, fields in `.js` and `.jsx` come out as native fields (`x = 1; y;`) in dev and in the bundle, while the same class in `.ts` is rewritten to `this.x = 1` in the constructor. Native fields have define semantics; Vite's docs call that "the standard ECMAScript runtime behavior" and tie `useDefineForClassFields` to TypeScript files ([Vite features](https://vite.dev/guide/features#usedefineforclassfields)).
- **What that means against today.** Today the page compiles class fields with `loose: true`. Babel: "When `true`, class properties are compiled to use an assignment expression instead of `Object.defineProperty`" ([Babel class-properties, `loose`](https://babeljs.io/docs/babel-plugin-transform-class-properties#loose)). Removing the Babel block therefore switches every page `.js` class from assignment to define. Without Babel there is no setting that keeps assignment for `.js`.
- **MobX 6.** "make sure to update your configuration to use a TC-39 spec compliant transpilation for class fields … Without this, class fields cannot be made observable before they are initialized." The settings it names are TypeScript `"useDefineForClassFields": true` and Babel class-properties with `loose: false` / `setPublicClassFields: false`. It gives a one-line check: `if (!new (class { x })().hasOwnProperty("x")) throw new Error("Transpiler is not configured correctly")` ([MobX installation](https://mobx.js.org/installation.html#use-spec-compliant-transpilation-for-class-properties)). Native fields in `.js` meet this. `tsconfig.json` here has `useDefineForClassFields: false`, which applies to `.ts`/`.tsx` (the shell and seven page components), not to the `.js` page store.

So after decorators are gone, the only Babel work left in the page build is JSX in `.js`, and only under option B.

## 5. What Jest still needs

Jest does not go through Vite. `jest.config.js` sends `.js`, `.jsx`, `.mjs`, `.ts`, `.tsx` to `jest/babelTransform.js` (`babel-jest` 27.5.1, peer `@babel/core ^7.8.0`).

| Entry in `jest/babelTransform.js` | After decorators are gone |
| --- | --- |
| `@babel/preset-env` `{ targets: { node: 'current' } }` | Keep. The file's own comment: "preset-env and preset-typescript are what Jest needs to load the page's ESM and .tsx imports." |
| `@babel/preset-typescript` | Keep, same reason. |
| `@babel/plugin-transform-react-jsx` `{ runtime: 'automatic' }` | Keep. Babel has no JSX support without it. |
| `@babel/plugin-proposal-decorators` `{ legacy: true }` | Remove. |
| `@babel/plugin-proposal-class-properties` `{ loose: true }` | Remove. Class properties are "included in `@babel/preset-env`, in ES2022" ([Babel class-properties](https://babeljs.io/docs/babel-plugin-transform-class-properties)); with `targets: node current` on Node 22 fields stay native, which is define semantics and matches the page build. Keeping the plugin with `loose: true` would leave Jest on assignment while the page runs define. |

Dependencies this frees, if nothing else uses them: `@babel/plugin-proposal-decorators` (listed under `dependencies`) and `@babel/plugin-proposal-class-properties`. `@babel/core` is not a direct dependency; today it arrives through plugin-react 5 and Jest, and after the upgrade through Jest alone (or directly under option B).

Babel 8 note: `@babel/plugin-proposal-decorators` 8.0.0 "removed the `legacy` and `decoratorsBeforeExport` options" ([Babel decorators, history](https://babeljs.io/docs/babel-plugin-proposal-decorators)). The legacy decorator setup cannot move to Babel 8.

## 6. Order constraints that follow

- Legacy decorators need the Babel block, so plugin-react 6 cannot land before the last decorator is removed (or it lands with option B carrying the decorator plugins as well, which the changelog's migration also allows).
- The assignment-to-define switch happens in the page at the moment the class-properties plugin leaves the page build, and in Jest at the moment it leaves `jest/babelTransform.js`. These are two separate edits; doing them together keeps tests and the page on the same semantics.
- The JSX-in-`.js` choice (A, B or C) must be made before or with the plugin upgrade.

## Not verified from a primary source

- Whether ESLint reads `.babelrc` in this repo, and so whether `.babelrc` can be deleted outright (section 4).
- Whether the `optimizeDeps.rolldownOptions.moduleTypes` block can go after option A (section 3).
- No doc states that plugin-react 6 fails on JSX in `.js`; that rests on the Vite source read plus the experiment.
- Nothing was run in this repo. The page store's behaviour under define semantics with MobX 6 is a question for the prototype ticket.

## The experiment

A scratch project outside the repo: `vite` 8.3.8, `@vitejs/plugin-react` 6.3.0, `react` 19, `@rolldown/plugin-babel` 0.3.1 with `@babel/core` 8.1.2 (the repo is on Babel 7), and a `tsconfig.json` copying this repo's `jsx`, `experimentalDecorators` and `useDefineForClassFields: false`. Files: a `.js` entry with JSX, and one class with fields `x = 1; y;` saved as `.js`, `.jsx` and `.ts`. Each candidate config ran through `vite build` and through a dev server's `transformRequest`; output was inspected for compiled JSX, `$RefreshReg$`, and the shape of the class fields. `electron-vite` was not part of the experiment.
