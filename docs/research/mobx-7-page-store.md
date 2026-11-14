# What MobX 7 changes beyond MobX 6 for the page store

Research for issue #116 (map #105). Looked up on 2026-11-14. Builds on the MobX 6 findings of #106
(`docs/research/mobx-6-page-store.md` on branch `research/mobx-6-page-store`); only what differs on 7, or
was re-checked on 7, is written here. Primary sources only: the MobX repository at the tag `mobx@7.1.7`
(docs, changelogs, source), mobx.js.org, the npm registry, GitHub releases. Section 9 is a reproduction
against the published packages and is labelled as such.

Short forms used below:

- `[7-docs]` = `https://github.com/mobxjs/mobx/blob/mobx%407.1.7/docs` (the source of mobx.js.org; the
  migration page is live at `https://mobx.js.org/migrating-from-6-to-7.html`)
- `[7-src]` = `https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src`
- `[mobx-changelog]` = `https://github.com/mobxjs/mobx/blob/main/packages/mobx/CHANGELOG.md`
- `[mrl-changelog]` = `https://github.com/mobxjs/mobx/blob/main/packages/mobx-react-lite/CHANGELOG.md`
- `[mrl-5]` = `https://github.com/mobxjs/mobx/blob/mobx-react-lite%405.1.3/packages/mobx-react-lite`

## 1. Versions (npm registry, 2026-11-14)

| Package | `latest` | Published | Peer dependencies | Dependencies |
| --- | --- | --- | --- | --- |
| `mobx` | **7.1.7** | 2026-11-13 | none | none |
| `mobx-react-lite` | **5.1.3** | 2026-11-13 | `mobx ^7.0.0`, `react ^18 \|\| ^19` | none |
| `mobx-undecorate` | 1.3.1 | n/a | n/a | n/a |

Source: `npm view <pkg> dist-tags`, `npm view <pkg>@latest peerDependencies dependencies`,
`npm view <pkg> time`.

- `mobx` 7.0.0 and `mobx-react-lite` 5.0.0 were published 2026-07-30 (GitHub release
  `https://github.com/mobxjs/mobx/releases/tag/mobx%407.0.0`). The 7 line is moving fast: 15 releases in
  15 weeks, the last four within the past two weeks.
- `mobx-react-lite` 5 no longer depends on `use-sync-external-store` (4.1.1 did, `^1.4.0`); it imports
  `useSyncExternalStore` from `react`.
- Peer ranges by line: `mobx-react-lite` 2.2.2 → `mobx ^4 || ^5`, `react ^16.8.0`; 4.1.1 → `mobx ^6.9.0`,
  `react ^16.8 || ^17 || ^18 || ^19`; 5.1.3 → `mobx ^7.0.0`, `react ^18 || ^19`. No version of
  `mobx-react-lite` spans two MobX majors, so `mobx` and `mobx-react-lite` move in the same change at
  every major step.
- `mobx-react-lite` 5 also checks at import time and throws: "mobx-react-lite requires React 18 or
  later" / "mobx-react-lite requires mobx at least version 7 to be available"
  (`[mrl-5]/src/utils/assertEnvironment.ts`).

## 2. The complete list of breaking changes in 7.0.0

Source: the `7.0.0` entry of `[mobx-changelog]` and `[7-docs]/migrating-from-6-to-7.md`. The guide opens:
"MobX 7 is mostly a cleanup release. Most applications that already use MobX 6 idiomatically can upgrade
with minimal changes."

1. "Legacy decorators are no longer supported." "MobX 7 supports Stage 3 decorators only."
2. Namespaced annotations and comparers are removed in favour of named exports:

   | Removed | Replacement |
   | --- | --- |
   | `observable.ref` | `observableRef` |
   | `observable.shallow` | `observableShallow` |
   | `observable.deep` | `observableDeep` |
   | `observable.struct` | `observableStruct` |
   | `computed.struct` | `computedStruct` |
   | `action.bound` | `actionBound` |
   | `flow.bound` | `flowBound` |
   | `comparer.identity` / `.default` / `.structural` / `.shallow` | `compareIdentity` / `compareDefault` / `compareStructural` / `compareShallow` |

   Also: the boolean option `{ compareStructural: true }` of `computed` / `reaction` becomes
   `{ equals: compareStructural }`.
3. "MobX now always uses Proxy-backed observable objects and arrays. The ES5/non-proxy fallback has been
   removed." `configure({ useProxies })` and `{ proxy: false }` are "no longer supported".
4. "The public `trace` API and its related runtime support have been removed."
5. React bindings: section 6.

Nothing else is listed as breaking. Unchanged names, confirmed in the 7 docs: `makeObservable`,
`makeAutoObservable`, `observable`, `computed`, `action`, `flow`, `override`, `configure`, `runInAction`,
`reaction`, `when`, `createAtom`.

Later 7.x entries that change behaviour (all from `[mobx-changelog]`): 7.0.2 `ObservableSet.replace` keeps
surviving values in place (iteration order changes); 7.0.6 the `create` spy event of `observable.box`
reports the raw value; 7.1.0 `computed(fn)` without `set` is typed read-only; 7.1.0 / 7.1.1 / 7.1.5
`enforceActions` diagnostics now also cover `ObservableSet.delete` and `ObservableMap` keys read through
`get` / `has`; 7.1.4 error messages name annotations by the new exports.

## 3. What that means in the page store

Checked against `origin/master` with `git grep`:

| MobX 7 change | Use in `src/` on `origin/master` |
| --- | --- |
| Legacy decorators removed | all 315 decorators in `src/app/store/` |
| `observable.ref` → `observableRef` | one: `src/app/store/Run.js:935` (`@observable.ref showPartitionFor`) |
| `action.bound`, `computed.struct`, `flow`, `flow.bound`, `comparer.*` | none |
| `configure(...)`, `useProxies`, `{ proxy: false }` | none |
| `trace` | none |
| Other `mobx` imports (`runInAction`, `reaction`, `createAtom`, `when`) | unchanged in 7 |

## 4. 6 vs 7 for this store

| Topic | MobX 6.16 | MobX 7.1 | Source for 7 |
| --- | --- | --- | --- |
| Legacy decorators + `makeObservable(this)` | work | removed; `makeObservable(this)` with no annotations throws (section 9, case 12) | `[7-docs]/migrating-from-6-to-7.md`, `[7-src]/api/makeObservable.ts` |
| Stage 3 decorators (`@observable accessor x`) | supported since 6.11 | supported, the only decorator form | `[7-docs]/enabling-decorators.md` |
| `makeObservable(this, { … })` | supported | supported, same call shape | `[7-docs]/observable-state.md` |
| Annotations `observable`, `computed`, `action`, `flow`, `override` | same names | same names | `[7-docs]/subclassing.md` |
| `observable.ref`, `action.bound`, … | exist | `undefined`; using one throws "Invalid annotation" (case 10) | changelog `7.0.0` |
| `observableRef`, `actionBound`, … | not exported | exported | changelog `7.0.0` |
| Every class calls its own `makeObservable` | required | required, same wording | `[7-docs]/observable-state.md#limitations` item 2 |
| Subclass may override | prototype `action` / `computed` / `flow` / `action.bound` via `override` | same, with `actionBound` | `[7-docs]/subclassing.md` |
| Redeclare annotated field in subclass | `TypeError: Cannot redefine property` | same | `[7-docs]/subclassing.md` |
| `makeAutoObservable` with a superclass or subclass | forbidden, throws in dev | same | `[7-docs]/subclassing.md` limitation 3, `[7-src]/api/makeObservable.ts` |
| Mixing decorators and annotations in one chain | unsupported | unsupported | `[7-docs]/observable-state.md#limitations` item 12 |
| `enforceActions` default | `"observed"`, warns | `"observed"`, warns | `[7-docs]/configuration.md`, `[7-src]/core/derivation.ts` |
| Class fields | spec-compliant (define) transpilation required | same text | `[7-docs]/installation.md` |
| Field initializers run before the constructor body | yes | yes (case 1) | reproduction |
| `configure({ useProxies })` | `"always"` default, `"never"` / `"ifavailable"` available | option removed; passing it is ignored without error (case 13) | `[7-docs]/configuration.md#proxy-support` |
| Runtime | ES5 fallback available | native `Proxy` required | `[7-docs]/installation.md` |
| `mobx-react-lite` | 4.1.1 | 5.1.3, deprecated hooks removed | section 6 |
| `mobx-undecorate` codemod | targets 6 | still targets 6; output needs renames for 7 | section 8 |

## 5. Topic by topic

### `makeObservable`, annotations, `override`

- The decorator-free form is the one the 6→7 guide prescribes: "If you don't want to keep decorators,
  remove them and pass an explicit annotation map to `makeObservable`" (`[7-docs]/migrating-from-6-to-7.md`).
- In 7 the second argument is mandatory in the source: `makeObservable(target, annotations, options?)`
  iterates `ownKeys(annotations)`; the MobX 6 branch that collected decorator metadata is gone
  (`[7-src]/api/makeObservable.ts`).
- `override` is unchanged. `[7-docs]/subclassing.md`: "When using `makeObservable`, use the `override`
  annotation for methods/getters overridden in a subclass."

### Subclassing rules from #106

All four still hold on 7; the limitation lists in `[7-docs]/subclassing.md` and
`[7-docs]/observable-state.md#limitations` are the MobX 6 lists with `action.bound` replaced by `actionBound`
(diffed against the same files at the tag `mobx@6.16.1`; `subclassing.md` differs in nothing else but its
title, now "Inheritance"):

- "`makeObservable` can only annotate properties declared by its own class definition. If a sub- or
  superclass introduces observable fields, it will have to call `makeObservable` for those properties
  itself."
- "Only `action`, `computed`, `flow`, `actionBound` defined **on prototype** can be **overridden** by
  subclass." "Field can't be re-annotated in subclass, except with `override`."
- "`makeAutoObservable` does not support subclassing."; "`makeAutoObservable` cannot be used on classes
  that have super or are subclassed" (`[7-docs]/observable-state.md`).
- "You can't provide different options to `makeObservable` in subclass." "You can't mix
  annotations/decorators in single inheritance chain."
- `safeDescriptors` and the two documented ways out of `TypeError: Cannot redefine property` are
  unchanged.
- Initializer order is a language rule, not a MobX one, and is unchanged (case 1).

### `enforceActions`

- Default is still `"observed"`: "`"observed"` (**default**): All state that is observed _somewhere_
  needs to be changed through actions." (`[7-docs]/configuration.md#enforceactions`)
- It still warns and does not throw: `checkIfStateModificationsAreAllowed` returns early outside
  development builds and otherwise calls `console.warn("[MobX] Since strict-mode is enabled, changing
  (observed) observable values without using an action is not allowed. Tried to modify: …")`
  (`[7-src]/core/derivation.ts`). Confirmed in case 14: the write succeeds.
- The 7.1.0 changelog line says deleting from an observed `ObservableSet` now "warns/throws just like
  insertion"; the function it routes through is the `console.warn` above. No throwing path was found in
  that function.
- 7.1.x widened what is checked (section 2), so code that was silent on 6 can warn on 7 for observable
  maps and sets.

### Class fields

`[7-docs]/installation.md` keeps the MobX 6 requirement unchanged: "make sure to update your configuration
to use a TC-39 spec compliant transpilation for class fields … Without this, class fields cannot be made
observable before they are initialized." TypeScript `"useDefineForClassFields": true`; Babel
`"assumptions": { "setPublicClassFields": false }`; same self-check line.

### Proxies and minimum runtime

- "MobX works in browsers and Node.js environments that provide native `Proxy` support."
  (`[7-docs]/installation.md`). "Use MobX 6 if you need to support environments without Proxy support"
  (`[7-docs]/configuration.md`).
- `mobx` 7.1.7 declares no `engines` field. The repository's root `tsconfig.json` has `"target": "es6"`.
  No statement of a minimum Node or browser version was found.
- `mobx-react-lite` 5 needs React 18+ (section 1).

### `flow`

`flow` keeps its name; only `flow.bound` → `flowBound`. The page store does not use `flow`.

## 6. `mobx-react-lite` 4 → 5

Source: the `5.0.0` entry of `[mrl-changelog]`, `[7-docs]/migrating-from-6-to-7.md`,
`[mrl-5]/src/index.ts`.

- Complete public surface of 5.1.3: `observer`, `Observer`, `useLocalObservable`, `enableStaticRendering`,
  `isUsingStaticRendering`, plus `clearTimers` and `_observerFinalizationRegistry`.
- Removed: `useObserver`, `useLocalStore`, `useAsObservableSource`, `useStaticRendering`,
  `observerBatching`, `isObserverBatched`, `batchingForReactDom`, `batchingOptOut`,
  `batchingForReactNative`, `observer(fn, { forwardRef: true })` ("pass an already-created
  `React.forwardRef(...)` component to `observer` instead"), and "legacy function-component
  `contextTypes` handling".
- `observer(fn)` for function components: same import, same call shape. "Keep function-component imports
  on `mobx-react-lite` if you do not need class component support." The 16 page files import only
  `observer`, so none of the removals touches them.
- 5.0.1 fixed a leak where the first render result was retained; 5.1.0 changed cleanup of reactions from
  uncommitted renders. Neither changes the API.
- Tests: the 7 docs and the `mobx-react-lite` 5 README say nothing about `act`. The only first-party
  statement remains the 3.4.0 changelog entry ("When using React 18, it is important that `act` is used
  in **unit tests** around every programmatic mutation. Without it, changes won't propagate!"). The
  README documents `clearTimers()` for `afterEach` when a test framework requires timers to be cleaned
  up (`[mrl-5]/README.md`).
- New in the 7 docs, optional: `mobx-react-plugin` (a build plugin that wraps components in `observer`)
  and a React Compiler page (`[7-docs]/installation.md`, `[7-docs]/react-compiler.md`).

## 7. Is a direct 5 → 7 jump supported?

- The official docs have two separate guides and neither mentions the other's range.
  `[7-docs]/migrating-from-4-or-5.md` is still titled "Migrating from MobX 4/5" and its steps are
  "1. Update `mobx` to the latest version of MobX 4/5 and solve any deprecation messages. 2. Update
  `mobx` to version 6." `[7-docs]/migrating-from-6-to-7.md` starts from MobX 6 ("applications that
  already use MobX 6 idiomatically"). So the documented route is 4/5 → 6 → 7.
- No source says a direct 5 → 7 jump is supported, and none says it is unsupported.
- What the sources do establish about a direct jump:
  - The staged option of the 4/5 guide — "Leave all the decorators and call `makeObservable(this)` …
    This is the recommended way if you want to limit the impact of a MobX 6 migration" — exists only on
    MobX 6. On 7 legacy decorators are gone and `makeObservable(this)` throws. That page on mobx.js.org
    still lists the option; it describes 6, not 7.
  - A decorator-free class written for MobX 6 (`makeObservable(this, { … })` with `override`) is the
    form the 7 guide prescribes. For this store the only source-level difference between the 6 form and
    the 7 form is `observable.ref` → `observableRef` at `Run.js:935`.
  - There is no MobX version that accepts both the old and the new annotation names: 6.16.1 does not
    export `observableRef` (re-checked on the published package), 7 does not have `observable.ref`. That one rename has to land in
    the same change as the `mobx` 6 → 7 bump.
  - `mobx` and `mobx-react-lite` must change together at each step (section 1).
  - MobX 5 with decorators and MobX 7 cannot coexist in one bundle state: on 5 the store needs
    decorators (`makeObservable` is not exported by 5.15.7, checked on the published package), on 7 it cannot have them. A direct jump therefore
    converts every store class and bumps both packages in a single change; going through 6 allows
    converting chain by chain while decorators still work (#106, section 7).

## 8. Transition aids on 7

- **Legacy decorators: none.** "If you still need legacy TypeScript decorators, use MobX 6. MobX 7
  requires migrating to modern decorators." (`[7-docs]/enabling-decorators.md`)
- **Stage 3 decorators: yes.** `@observable accessor x`, `@computed`, `@action`, `@observableRef
  accessor x`; no `makeObservable` call. Needs TypeScript ≥ 5 without `experimentalDecorators`, or
  `@babel/plugin-proposal-decorators` with `"version": "2023-05"`. `accessor` fields become
  non-enumerable prototype accessors, which changes `Object.keys` / `JSON.stringify` / spread
  (`[7-docs]/enabling-decorators.md`). The map excludes this route; it is listed because it is the only
  decorator form 7 has.
- **Codemod: no 7-specific one.** `mobx-undecorate` is still at 1.3.1 and its README still reads "Update
  MobX 4/5 code to be conformant to MobX 6"
  (`https://github.com/mobxjs/mobx/blob/mobx-undecorate%401.3.1/packages/mobx-undecorate/README.md`).
  The 6→7 guide names no codemod. Run on a sample (section 9), 1.3.1 emits `observable.ref` and
  `action.bound`, which do not exist in 7, and emits `computed` instead of `override` for an overriding
  getter (the limit #106 already recorded).
- **ESLint plugin:** `eslint-plugin-mobx` 0.2.2 is referenced from `[7-docs]/configuration.md` as having
  autofix for boilerplate; not examined here.

## 9. Reproduction

Not a primary source, a check of the above. Plain Node v22.18.0 (native class fields), `mobx@7.1.7` and
`mobx-react-lite@5.1.3` from npm, in a scratch directory outside the repository. Parent class shaped like
`Option.js`. Cases 1–9 repeat the #106 table on 7.

| # | Case | Result on 7.1.7 | Same as 6.16.1 (#106)? |
| --- | --- | --- | --- |
| 1 | field `value = this.defaultValue`, `defaultValue` set in the constructor | `value` is `undefined` | yes |
| 2 | subclass adds a getter and calls its own `makeObservable(this, { extra: computed })` | works | yes |
| 3 | subclass overrides a parent getter/method and calls no `makeObservable` | works; the override is still computed / an action | yes |
| 4 | subclass annotates an overridden getter with `computed` | throws "Cannot apply 'computed' to '…'" | yes |
| 5 | subclass annotates overridden getter and method with `override` | works | yes |
| 5b | `override` on a member the parent does not annotate | throws "is annotated with 'override', but no such annotated member was found on prototype" | yes |
| 6 | subclass redeclares an annotated `observable` field | `TypeError: Cannot redefine property: value` | yes |
| 7 | subclass redeclares an annotated arrow-action field | `TypeError: Cannot redefine property: f` | yes |
| 8 | `makeAutoObservable(this)` in a subclass | throws "can only be used for classes that don't have a superclass" | yes |
| 9 | subclass of a base that calls `makeAutoObservable(this)` | same throw | yes |
| 10 | `makeObservable(this, { x: observable.ref })` | throws "Cannot annotate '….x': Invalid annotation." (`observable.ref` is `undefined`) | new on 7 |
| 11 | `makeObservable(this, { x: observableRef })` | works; the stored object is not made observable | new on 7 |
| 12 | `makeObservable(this)` with no annotations | `TypeError: Reflect.ownKeys called on non-object` | new on 7 |
| 13 | `configure({ useProxies: "never" })` | no error, no effect | new on 7 |
| 14 | assign an observed observable outside an action, default config | `console.warn` "Since strict-mode is enabled …", write succeeds | yes |
| 15 | `require("mobx-react-lite")` export list | `Observer`, `_observerFinalizationRegistry`, `clearTimers`, `enableStaticRendering`, `isUsingStaticRendering`, `observer`, `useLocalObservable` | n/a |

`mobx-undecorate@1.3.1` run through `npx` on a two-class sample (`@observable`, `@observable.ref`,
`@computed`, arrow `@action`, `@action.bound`, and a subclass overriding a `@computed` getter) produced
`tree: observable.ref`, `reset: action.bound` and, in the subclass, `isDefault: computed`.

## 10. Not verified from a primary source

- Whether a direct MobX 5 → 7 upgrade is "supported": the docs are silent either way (section 7).
- `act` in tests under `mobx-react-lite` 5 and React 19: no first-party statement newer than the 3.4.0
  changelog entry. Nothing was rendered here; `observer` was not exercised under React 19, only its
  export and peer range were checked.
- A minimum Node / browser version for MobX 7 beyond "native `Proxy` support".
- Whether legacy-decorator syntax fails loudly or silently on 7. The docs say it is unsupported; no
  Babel-compiled legacy decorator was run against 7. (Calling `observable(proto, "x", descriptor)` by
  hand did not throw, which suggests no explicit guard, but that is not the same test.)
- The "warns/throws" wording of the 7.1.0 changelog entry was not traced beyond
  `checkIfStateModificationsAreAllowed`.
- Nothing was run against this repository's code, build or tests.
