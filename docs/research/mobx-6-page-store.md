# What MobX 6 changes for the page store

Research for issue #106 (map #105). Looked up on 2026-11-14. Primary sources only: the MobX repository
(docs, changelogs, source) pinned to the tag `mobx@6.16.1`, the npm registry, and GitHub releases.

**Read this first:** mobx.js.org now documents **MobX 7**, not MobX 6. Pages there use names that do not
exist in MobX 6 (`observableRef`, `actionBound`) and no longer describe legacy decorators or `useProxies`.
For MobX 6, read the docs at the tag: `https://github.com/mobxjs/mobx/tree/mobx%406.16.1/docs`. Every doc
link below points at that tag, shortened as `[6-docs]/<file>`.

Short forms used below:

- `[6-docs]` = `https://github.com/mobxjs/mobx/blob/mobx%406.16.1/docs`
- `[mobx-changelog]` = `https://github.com/mobxjs/mobx/blob/main/packages/mobx/CHANGELOG.md`
- `[mrl-changelog]` = `https://github.com/mobxjs/mobx/blob/main/packages/mobx-react-lite/CHANGELOG.md`
- `[6-src]` = `https://github.com/mobxjs/mobx/blob/mobx%406.16.1/packages/mobx/src`

## 1. Versions (npm registry, 2026-11-14)

| Package | `latest` | Newest in the line the map targets | Peer dependencies of that version |
| --- | --- | --- | --- |
| `mobx` | 7.1.7 (2026-11-13) | **6.16.1** (2026-06-08) | none |
| `mobx-react-lite` | 5.1.3 (2026-11-13) | **4.1.1** (2025-09-27) | `mobx ^6.9.0`, `react ^16.8.0 \|\| ^17 \|\| ^18 \|\| ^19` |
| `mobx-undecorate` | 1.3.1 | n/a | n/a |

Source: `npm view mobx`, `npm view mobx-react-lite`, `npm view mobx-react-lite@4.1.1 peerDependencies`.

- "Latest `mobx` 6" is no longer `latest` on npm. MobX 7.0.0 shipped 2026-07-30 together with
  `mobx-react-lite` 5.0.0. `npm install mobx@latest` installs 7; the map's target needs `mobx@^6.16.1`
  and `mobx-react-lite@^4.1.1`.
- `mobx-react-lite` 5 peers are `mobx ^7.0.0`, `react ^18 || ^19`. It cannot be used with MobX 6.
- There is no bridge version across the 5 → 6 jump: `mobx-react-lite` 2.2.2 peers on
  `mobx ^4.0.0 || ^5.0.0`, 3.0.0 on `mobx ^6.0.0`. `mobx` and `mobx-react-lite` have to move in the same
  change.
- What MobX 7 removes (relevant because it shows where the 6 line ends): legacy decorators,
  `configure({ useProxies })`, and the namespaced annotations (`observable.ref` → `observableRef`,
  `action.bound` → `actionBound`, `computed.struct` → `computedStruct`, …). `makeObservable` with
  annotations stays. Source: `[mobx-changelog]#700`. MobX 6.16.1 does not export the new names (checked
  against the installed package), so code written for 6 with `observable.ref` needs a rename to reach 7.

## 2. Every class must call `makeObservable`

- "Using `makeObservable` / `makeAutoObservable` needs to be done in every class definition that declares
  MobX based members. So if a sub-class and super-class both introduce observable members, they will both
  have to call `makeObservable`." (`[6-docs]/migrating-from-4-or-5.md`)
- "`makeObservable` can only annotate properties declared by its own class definition."
  (`[6-docs]/observable-state.md#limitations`, item 2)
- The call and its annotations must be unconditional (item 9). The `options` argument can be given once
  and cannot differ in a subclass (item 3).

## 3. Subclass rules under `makeObservable`

Source: `[6-docs]/subclassing.md`, `[6-docs]/observable-state.md#limitations`, and the 6.1.0 entry of
`[mobx-changelog]` (which introduced `override` and says "we strongly recommend to go to 6.1 in one go,
and skip 6.0.*").

| Member in the parent | Subclass may override it? | How |
| --- | --- | --- |
| `computed` getter on the prototype | yes | annotate it `override` in the subclass's `makeObservable` |
| `action` / `action.bound` / `flow` method on the prototype | yes | annotate it `override` |
| annotated `observable` field | **no** | redeclaring it throws `TypeError: Cannot redefine property` |
| annotated arrow-function field (`x = () => {}` with `x: action`) | **no** | same `TypeError` |
| non-annotated field wrapped by hand (`x = action(() => {})`) | yes | plain redeclaration |

- "Only `action`, `computed`, `flow`, `action.bound` defined **on prototype** can be **overridden** by
  subclass." "Field can't be re-annotated in subclass, except with `override`."
- Re-annotating an inherited member with `computed` / `action` instead of `override` throws: "Cannot apply
  'computed' to '…': The field is already annotated with 'computed'. Re-annotating fields is not allowed.
  Use 'override' annotation for methods overridden by subclass." (`[6-src]/types/observableobject.ts`;
  reproduced, see section 10.)
- `override` with nothing to override throws in development builds: "… is annotated with 'override', but
  no such annotated member was found on prototype." (`[6-src]/types/overrideannotation.ts`)
- The cause of the `TypeError`: "**All annotated** fields of non-plain objects (**classes**) are
  **non-configurable**", and action/flow fields are also non-writable. Both can be switched off with
  `configure({ safeDescriptors: false })`, which the docs mark "Use with caution" and intend for
  spying/mocking in tests. (`[6-docs]/configuration.md#safedescriptors-boolean`)
- The docs give two ways out for an arrow-function action that a subclass must override: move it to the
  prototype and annotate `action.bound` in the parent plus `override` in the child, or drop the annotation
  and write `x = action(() => {})` in both. (`[6-docs]/subclassing.md`)
- "You can't mix annotations/decorators in single inheritance chain." A parent with decorators and a
  child with an annotations map (or the reverse) is unsupported; `makeObservable` throws "second arg must
  be nullish when using decorators" (`[6-src]/api/makeObservable.ts`). An inheritance chain (`Option` and
  its subclasses, `InputFile` and its two, `AppStore` and `RunList`) therefore has to convert as a unit.

## 4. `makeAutoObservable`

- "`makeAutoObservable` cannot be used on classes that have super or are subclassed."
  (`[6-docs]/observable-state.md#makeautoobservable`); "`makeAutoObservable` does not support subclassing"
  (`[6-docs]/subclassing.md`).
- Enforced at runtime in development builds: "'makeAutoObservable' can only be used for classes that
  don't have a superclass" (`[6-src]/api/makeObservable.ts`). The check fires both when a subclass calls
  it and when an instance of a subclass runs a base-class constructor that calls it (section 10, cases 8
  and 9).
- It infers: own properties → `observable`, getters → `computed`, setters → `action`, functions →
  `autoAction`, generators → `flow`; `false` in the overrides argument excludes a member.
- It is not equivalent to today's decorators: every own field becomes deeply `observable` and every
  method an `autoAction`, including members that carry no decorator now.
- For the page store this rules it out for `Option`, `InputFile`, `AppStore` and all their subclasses. It
  is only available to classes with no parent and no children.

## 5. `enforceActions`

- 6.0.0 breaking change: "Strict mode for actions is now enabled by default in `observed` mode."
  (`[mobx-changelog]#600`)
- Values (`[6-docs]/configuration.md#enforceactions`): `"observed"` (default) – "All state that is
  observed _somewhere_ needs to be changed through actions"; `"never"`; `"always"` – also covers creation.
- It **warns, it does not throw**. In development builds MobX logs `[MobX] Since strict-mode is enabled,
  changing (observed) observable values without using an action is not allowed. Tried to modify: <name>`
  through `console.warn` (`[6-src]/core/derivation.ts`). The write still happens.
- What trips it: assigning an observable that currently has an observer from outside an action — typically
  the code after an `await` inside an `async` method, a promise/timer/IPC callback, or an un-annotated
  method. Unobserved observables can be changed freely under `"observed"`.
- Migration guide: "During migration, we recommend to configure MobX in the same way as it would be in
  v4/v5 out of the box: `configure({ enforceActions: "never" })`", then consider `"observed"` afterwards.
  (`[6-docs]/migrating-from-4-or-5.md`)
- The page store has no `configure(` call on `origin/master`, so it would take the new default.
- 6.0.0 also forbids changing state directly inside a `computed`, or inside the predicate of `when` /
  `reaction` (`[mobx-changelog]#600`, "obscure" list).

## 6. Class fields and proxies

- "make sure to update your configuration to use a TC-39 spec compliant transpilation for class fields …
  Without this, class fields cannot be made observable before they are initialized."
  (`[6-docs]/installation.md`)
  - TypeScript: `"useDefineForClassFields": true`.
  - Babel ≥ 7.13: `@babel/plugin-proposal-class-properties` with `"assumptions": { "setPublicClassFields":
    false }`; before 7.13, `{ "loose": false }`. The migration guide says: "disable the legacy loose field
    support".
  - Self-check from the docs: `if (!new class { x }().hasOwnProperty('x')) throw new Error('Transpiler is
    not configured correctly');`
- What the wrong setting breaks, exactly: "`make(Auto)Observable` only supports properties that are
  already defined … Without correct configuration, fields that are declared but not initialized (like in
  `class X { y; }`) will not be picked up correctly." The documented work-around is to assign a value to
  every field before the `make(Auto)Observable` call. (`[6-docs]/observable-state.md#limitations`, item 1)
- State on `origin/master`: `.babelrc`, `jest/babelTransform.js` and `electron.vite.config.js` all set
  class-properties `loose: true`; `tsconfig.json` sets `useDefineForClassFields: false` and
  `experimentalDecorators: true`. All four are the opposite of what MobX 6 asks for.
- **Initialization order changes.** MobX 5 legacy decorators install a prototype accessor and create the
  observable on first access (`createPropDecorator` / `initializeInstance` in the installed
  `mobx@5.15.7/lib/mobx.js`), so a decorated field's initializer runs lazily, after the constructor body.
  In MobX 6 a field is an ordinary class field: its initializer runs before the constructor body of its
  class. `src/app/store/Option.js` has `@observable value = this.defaultValue;` with `defaultValue`
  assigned in the constructor; converted literally, `value` starts as `undefined` (section 10, case 1).
  This is a conclusion from reading both sources plus a reproduction, not a statement in the MobX docs.
- Proxies: MobX 6 defaults to `useProxies: "always"`, the MobX 5 behaviour; `"never"` exists only for
  engines without `Proxy` (`[6-docs]/configuration.md#proxy-support`). Coming from MobX 5 nothing has to
  be configured. Class instances passed to `makeObservable` are modified in place, not wrapped in a
  Proxy; plain objects and arrays stored in a deep `observable` field are still proxied.
- Functions stored in a deep observable structure are converted to `autoAction` (generators to `flow`),
  so "the original function reference is not preserved"; `observable.ref` / `observable.shallow` / `false`
  prevent it. (`[6-docs]/migrating-from-4-or-5.md`, "Functions are auto-converted")

## 7. Legacy decorators on MobX 6

- They still work in every MobX 6 release: "it is in the current major version still possible. Support
  for legacy decorators will be removed in MobX 7." (`[6-docs]/enabling-decorators.md`, "Using legacy
  decorators")
- Requirement 1: every class with decorated members calls `makeObservable(this)` in its constructor, with
  **no** second argument. "MobX before version 6 did not require the `makeObservable(this)` call … it now
  does." Without the call the decorators do nothing.
- Requirement 2, compiler: Babel `["@babel/plugin-proposal-decorators", { "legacy": true }]` followed by
  `["@babel/plugin-proposal-class-properties", { "loose": false }]` — "In contrast to MobX 4/5, "loose"
  must be false!"; TypeScript `experimentalDecorators: true` and `useDefineForClassFields: true`. This
  wording is from the 6.10.2 docs
  (`https://github.com/mobxjs/mobx/blob/mobx%406.10.2/docs/enabling-decorators.md`); the 6.16.1 page keeps
  the legacy example but dropped the config block.
- Subclass rules are the same as section 3, with `@override` as the decorator form. Re-decorating an
  inherited member throws "Re-decorating fields is not allowed. Use '@override' decorator for methods
  overridden by subclass." (`[6-src]/api/decorators.ts`)
- Decorators and annotation maps cannot be mixed within one inheritance chain (section 3), but nothing in
  the docs forbids one unrelated class using decorators while another uses annotations.
- The 6.10.2 page lists as "not officially supported": redefining decorated class members in inheritance
  trees, decorating static members, combining MobX decorators with other decorators.
- The initialization-order change in section 6 applies with decorators kept as well: in MobX 6 the
  decorator only records an annotation (`storeAnnotation` in `[6-src]/api/decorators.ts`).

## 8. The `mobx-undecorate` codemod

Source: `https://github.com/mobxjs/mobx/blob/mobx%406.16.1/packages/mobx-undecorate/README.md`, its
`CHANGELOG.md` and `src/undecorate.ts`, and `[6-docs]/migrating-from-4-or-5.md`.

- Run with `npx mobx-undecorate` in the source directory. Converts `@computed`, `@action`, `@observable`,
  `@observer`, `@inject` and `decorate(...)`.
- Default: removes the decorators and inserts `makeObservable(this, { … })` in the constructor.
  `--keepDecorators`: leaves decorators and inserts `makeObservable(this)`.
- Other flags: `--ignoreImports`, `--decoratorsAfterExport`, `--parseTsAsNonJsx`.
- Documented limit: it creates a constructor where a class has none. "If base class of the constructor
  expects arguments, the codemod cannot introduce these arguments for the subclass being upgraded, and
  the `super` call won't pass them either. You have to fix these manually." It leaves a
  `// TODO: [mobx-undecorate]` comment there.
- Limits visible in the source and changelog:
  - It emits `override` **only** when the member carries the TypeScript `override` keyword (1.3.0:
    "partial fix #3460: replace `action` with `override` if field uses override keyword"). The page store
    is JavaScript, so an overriding member in a subclass comes out as `computed` / `action` and throws
    the re-annotation error of section 3 at construction. Each override has to be fixed by hand.
  - Static decorated properties are skipped with a warning.
  - It does not touch compiler configuration, `enforceActions`, or initialization order (sections 5, 6).

## 9. `mobx-react-lite` 2 → 4

Sources: `[mrl-changelog]`; `https://github.com/mobxjs/mobx-react-lite/releases/tag/3.0.0`; the 4.1.1
package (`https://github.com/mobxjs/mobx/blob/mobx-react-lite%404.1.1/packages/mobx-react-lite/src/index.ts`,
`README.md`, `package.json`).

- **3.0.0** (2020-10-12): "Deprecation of most of the API (see README) and minor changes for MobX 6
  compatibility. No breaking changes should be present despite the major version." Peer `mobx ^6.0.0`.
  Deprecated: `useObserver`, `useLocalStore`, `useAsObservableSource`, `useStaticRendering`; new:
  `useLocalObservable`, `enableStaticRendering`.
- **3.3.0**: `observer(forwardRef(fn))` supported; `observer(fn, { forwardRef: true })` deprecated.
- **3.4.0**: React 18 support. "When using React 18, it is important that `act` is used in **unit tests**
  around every programmatic mutation. Without it, changes won't propagate!"
- **4.0.0**: "Components now use `useSyncExternalStore`, which should prevent tearing - you have to update
  mobx, otherwise it should behave as previously." Also improved `displayName`/`name` handling. Peer
  becomes `mobx ^6.9.0` and it adds the dependency `use-sync-external-store` (read from 4.0.1, the first
  4.x version on npm).
- **4.0.3**: fixed `observer` in `StrictMode`. **4.0.5**: observer switched from global to local state
  version. **4.0.6**: fixed components rendering twice.
- **4.1.0** (2024-12-11): "Added React 19 support". Earlier 4.x versions peer on React up to 18 only.
- `observer` itself: same import, same call shape for function components (`observer(fn)`). No change is
  required at the 16 call sites that import only `observer`.
- Nothing is removed in 4.x: `useObserver`, `useLocalStore`, `useAsObservableSource`,
  `useStaticRendering`, `observerBatching` and `isObserverBatched` are still exported by 4.1.1, with
  development-time deprecation warnings. They are removed in 5.0.0, along with
  `observer(fn, { forwardRef: true })` (`[mrl-changelog]#500`). The page imports none of them.
- Batching: "From 2.2 onward it will be configured automatically"; no `batchingForReactDom` import is
  needed.

## 10. Reproduction

Not a primary source, a check of the above. Plain Node (native class fields, i.e. spec semantics) with
`mobx@6.16.1`, a parent shaped like `Option.js`:

| # | Case | Result |
| --- | --- | --- |
| 1 | field `value = this.defaultValue`, `defaultValue` set in the constructor | `value` is `undefined` |
| 2 | subclass adds a getter and calls its own `makeObservable(this, { extra: computed })` | works |
| 3 | subclass overrides a parent getter/method and calls no `makeObservable` | works, no error (not a documented pattern) |
| 4 | subclass annotates an overridden getter with `computed` | throws "Re-annotating fields is not allowed" |
| 5 | subclass annotates overridden getter and method with `override` | works |
| 6 | subclass redeclares an annotated `observable` field | `TypeError: Cannot redefine property: value` |
| 7 | subclass redeclares an annotated arrow-action field | `TypeError: Cannot redefine property: setValue` |
| 8 | `makeAutoObservable(this)` in a subclass | throws "can only be used for classes that don't have a superclass" |
| 9 | subclass of a base that calls `makeAutoObservable(this)` | same throw |
| 10 | assign an observed observable outside an action, default config | `console.warn` "Since strict-mode is enabled …", write succeeds |

## 11. Not verified from a primary source

- Whether Babel's legacy decorators plugin works together with class-properties `loose: false` /
  `setPublicClassFields: false` in this repository's Babel version. MobX's 6.10.2 docs prescribe that
  pair; the Babel docs were not checked here.
- How the page store behaves under React 19 with `useSyncExternalStore`-based `observer` (tests needing
  `act`, render counts). The changelog states the requirement; nothing was run against this app.
- Which page-store members are actually overridden in subclasses, and which async methods write observed
  state after an `await`. That inventory is ticket #108; only `Option.js` was read here.
- The `[mobx-changelog]#700` / `#600` and `[mrl-changelog]#500` anchors are GitHub heading anchors and
  may not resolve exactly; the entries are the `7.0.0`, `6.0.0` and `5.0.0` headings in those files.
