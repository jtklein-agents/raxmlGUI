# MobX 7 annotation maps and TypeScript

Research for #227 (map #225). Facts only; no conversion design.

Read against `origin/master` at `b0d2729`, with `mobx` 7.1.7, `mobx-utils` 6.1.1, `mobx-react-lite` 5.1.3, `typescript` 5.9.3, `@babel/core` and `@babel/preset-typescript` 7.29.7, `vite` 8.3.7 installed.

Source key:

- **[src]** is the MobX source at tag `mobx@7.1.7`, `https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/`. The same files ship in `node_modules/mobx/src`, and the typings in `node_modules/mobx/dist` are generated from them.
- **[docs]** is the MobX docs source on `main`, `https://github.com/mobxjs/mobx/blob/main/docs/`, published at `https://mobx.js.org/`.
- **[probe]** means I typechecked or transformed a throwaway file with the installed toolchain. The probes are not committed; each is small enough to retype from the description.

## Correction to the ticket's premise

`tsconfig.json` on `master` has `"useDefineForClassFields": true` and no `experimentalDecorators` key. Commit `bd586b7` (#504) changed it from `experimentalDecorators: true` / `useDefineForClassFields: false`. The ticket and the map brief describe the older file.

## 1. How `makeObservable(this, annotations)` is typed

Signature ([src] [`api/makeObservable.ts` L23-27](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/makeObservable.ts#L23-L27)):

```ts
function makeObservable<T extends object, AdditionalKeys extends PropertyKey = never>(
    target: T,
    annotations: AnnotationsMap<T, NoInfer<AdditionalKeys>>,
    options?: CreateObservableOptions
): T
```

Map type ([src] [`api/annotation.ts` L26-35](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/annotation.ts#L26-L35)):

```ts
type AnnotationMapEntry = Annotation | true | false
type AnnotationsMap<T, AdditionalFields extends PropertyKey> = {
    [P in Exclude<keyof T, "toString">]?: AnnotationMapEntry
} & Record<AdditionalFields, AnnotationMapEntry>
```

What follows from those two types:

- **Allowed keys** are `keyof T` minus `toString`, all optional, plus every key in `AdditionalKeys`, all required. With `this` as target, `T` is inferred as the polymorphic `this` type, and `keyof` sees only public members.
- **Private and protected members** are not in `keyof T`. The docs give the form: `makeObservable<MyStore, "privateField" | "privateField2">(this, { privateField: observable, privateField2: observable })` ([docs] [`observable-state.md`, Limitations item 8](https://github.com/mobxjs/mobx/blob/main/docs/observable-state.md#limitations)). The source comment on `AnnotationsMap` names the same purpose and issue #2339.
- **The error without it** [probe]: `error TS2353: Object literal may only specify known properties, and 'secret' does not exist in type 'AnnotationsMap<this, never>'.` The same error appears for a key that names no member at all, and for a `protected` member annotated from a subclass constructor.
- **A key listed in `AdditionalKeys` must be annotated** [probe]: leaving it out gives `TS2345 ... Property 'secret' is missing in type ... but required in type 'Record<"secret", AnnotationMapEntry>'`.
- `AdditionalKeys` is wrapped in `NoInfer`, so it is never inferred from the map; it must be written explicitly together with `T`.
- **The annotation kind is not checked against the member.** Every annotation is typed `Annotation` (or `true`/`false`), so `{ aField: computed, aGetter: action }` typechecks [probe]. The mismatch is a runtime error in development builds: `Cannot apply 'computed' to 'X.y': 'computed' can only be used on getter(+setter) properties.` ([src] [`types/computedannotation.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/types/computedannotation.ts), and the matching checks in `actionannotation.ts`, `flowannotation.ts`, `observableannotation.ts`).
- `makeObservable` returns `T` unchanged. Annotating a member does not change its TypeScript type.
- **ECMAScript `#private` fields** are not supported by `make(Auto)Observable`; the docs recommend the TypeScript `private` modifier instead ([docs] `observable-state.md`, Limitations item 11).
- **Runtime check on keys**: a key that is not `in` the target throws `[MobX] Cannot apply '<annotation>' to '<name>.<key>': Field not found.` ([src] `api/makeObservable.ts` L98-100, [`errors.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/errors.ts) entry 1). Section 4 depends on this.

## 2. Subclassing rules

From [docs] [`subclassing.md`](https://github.com/mobxjs/mobx/blob/main/docs/subclassing.md) (published as [Inheritance](https://mobx.js.org/subclassing.html)), "Limitations":

1. Only `action`, `computed`, `flow`, `actionBound` defined **on the prototype** can be overridden by a subclass.
2. A field cannot be re-annotated in a subclass, except with `override`.
3. `makeAutoObservable` does not support subclassing.
4. Extending builtins (`ObservableMap`, `ObservableArray`, ...) is not supported.
5. A subclass cannot pass different `options` to `makeObservable`.
6. Annotations and decorators cannot be mixed in one inheritance chain.
7. The limitations in `observable-state.md` also apply. The relevant ones: `makeObservable` "can only annotate properties declared by its own class definition", so each class in a chain calls `makeObservable` for its own members (item 2); every field is annotated once (item 4); annotated fields of classes are non-configurable (item 5); `action` and `flow` members are non-writable (item 6).

The same page: annotated instance fields (an `observable` field, an arrow function annotated `action`) cannot be redeclared in a subclass and fail with `TypeError: Cannot redefine property`; non-annotated instance fields can.

Which of these the **types** enforce: none. `override` is declared `export declare const override: Annotation` ([src] [`types/overrideannotation.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/types/overrideannotation.ts)), so `{ anObservableField: override }` and re-annotating an inherited key with `action` both typecheck [probe]. MobX's `override` annotation is unrelated to TypeScript's `override` keyword and `noImplicitOverride` (not set in this repo).

Which the **runtime** enforces, in development builds only (`__DEV__`):

- Re-annotating an already annotated key with anything but `override`: `Cannot apply '<new>' to '<name>.<key>': The field is already annotated with '<old>'. Re-annotating fields is not allowed. Use 'override' annotation for methods overridden by subclass.` ([src] [`types/observableobject.ts`, `assertAnnotable`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/types/observableobject.ts#L709-L762)).
- `override` on a key no ancestor annotated: `'<name>.<key>' is annotated with 'override', but no such annotated member was found on prototype.` `override` on a plain object also throws ([src] `types/overrideannotation.ts` L15-31).
- `override` itself does nothing else: its `make_` returns `Cancel`. The parent's annotation already walked the prototype chain and wrapped the subclass's method ([src] `api/makeObservable.ts` L101-114, `types/actionannotation.ts` `make_`).
- `makeAutoObservable` on a class with a superclass throws ([src] `api/makeObservable.ts` L45-48).

A subclass method that shadows an **unannotated** inherited method is annotated with the plain kind, not `override`: `override` requires a previously applied annotation on that key.

## 3. Typing each annotation kind

- **`computed` getter.** No MobX type is involved. The property's type is the getter's own return type [probe]. `computed` as an annotation is the `IComputedFactory` value used as an `Annotation` ([src] [`api/computed.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/computed.ts)).
- **`flow` generator method.** TypeScript still sees the method as returning the generator: for `*fetch(n: number) { const r: string = yield p; return r.length + n }`, `b.fetch(1)` is typed `Generator<Promise<string>, number, string>` and `await`ing it as a `number` is `TS2322` [probe]. `flowResult(b.fetch(1))` is typed `CancellablePromise<number>` [probe]; its declaration is `flowResult<T>(result: T): T extends Generator<any, infer R, any> ? CancellablePromise<R> : T extends CancellablePromise<any> ? T : never`, and its body is `return result as any` ([src] [`api/flow.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/flow.ts)). The docs: "`flowResult` function is only needed when using TypeScript ... TypeScript isn't aware of that transformation" ([docs] [`actions.md`, "Using flow instead of async / await"](https://github.com/mobxjs/mobx/blob/main/docs/actions.md)). The annotation table adds: "the inferred return type in TypeScript might be off" ([docs] `observable-state.md`, Available annotations). Values received from `yield` are typed by the generator's `TNext`, which is `any` unless the local is annotated.
- **`flow(function* () {})` wrapper form.** Returns `(...args: Args) => CancellablePromise<R>` directly, so no `flowResult` is needed; `this` has to be typed as a parameter ([docs] `actions.md`, "using flow on object fields"; [probe] for the return type).
- **`actionBound`** (MobX 6 `action.bound`). Typed `DecoratorAnnotation<ClassMethodAndFieldDecorator>`, which is `Annotation & Decorator` ([src] [`api/action.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/action.ts), `api/decoratorannotation.ts`). The method keeps its declared type. At runtime the bound function becomes an own, non-writable property of the instance ([src] `types/actionannotation.ts`, `createActionDescriptor`).
- **`action` on an arrow-function field.** The field keeps its declared function type. The annotated field is non-configurable and non-writable ([docs] `observable-state.md`, Limitations items 5-6).
- **`observableRef` / `observableShallow`** (MobX 6 `observable.ref` / `observable.shallow`). Both are `DecoratorAnnotation<ClassAccessorAndFieldDecorator>` ([src] [`api/observable.ts`](https://github.com/mobxjs/mobx/blob/mobx%407.1.7/packages/mobx/src/api/observable.ts)). The field keeps its declared type; MobX adds no `IObservableArray`/`ObservableMap` type to a class field annotated `observable` either. Semantics: [docs] `observable-state.md`, Available annotations.

## 4. `useDefineForClassFields` and `experimentalDecorators`

What MobX documents as required ([docs] [`installation.md`, "Use spec compliant transpilation for class properties"](https://github.com/mobxjs/mobx/blob/main/docs/installation.md)):

- TypeScript: `"useDefineForClassFields": true`.
- Babel: `@babel/plugin-proposal-class-properties` with `{ loose: false }` (or the `setPublicClassFields: false` assumption).
- Reason given: "Without this, class fields cannot be made observable before they are initialized." `observable-state.md` Limitations item 1 says the same: declared-but-uninitialized fields "will not be picked up correctly" without it, and the workaround is to assign every property before calling `makeObservable`.

Where the repo stands:

- `tsconfig.json`: `useDefineForClassFields: true`, `noEmit: true`. `tsc` only typechecks, so the flag changes diagnostics, not emitted code. TypeScript's description of the flag: [tsconfig reference](https://www.typescriptlang.org/tsconfig#useDefineForClassFields) and the [3.7 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-3-7.html#the-usedefineforclassfields-flag-and-the-declare-property-modifier).
- Jest (`jest/babelTransform.js`) and the renderer build (`electron.vite.config.js`) both run `@babel/plugin-proposal-class-properties` with `loose: false`, the documented Babel setting.

One place the flag's meaning does reach emitted code, in Jest:

- `@babel/preset-typescript` 7 has `allowDeclareFields` defaulting to `false`; only "when enabled, type-only class fields are only removed if they are prefixed with the `declare` modifier" ([Babel docs, `allowDeclareFields`](https://babeljs.io/docs/babel-plugin-transform-typescript#allowdeclarefields)). `jest/babelTransform.js` does not set it.
- [probe] With the Jest transform's preset, `class A { value: number; init = 1 }` compiles to a class with only `init`: the type-only field is deleted. With `allowDeclareFields: true` the output keeps `value;`.
- Combined with the "Field not found" runtime check in section 1: a field that has a type but no initializer, and is annotated before it is assigned, would throw under Jest once its file is `.ts`. Fields declared without an initializer today: `Option.value` (`src/app/store/Option.js:43`, annotated `observable` at `:23`, assigned at `:42` after the `makeObservable` call), `Run.atomAfterRun` (`src/app/store/Run.js:238`) and `Run.atomFinished` (`src/app/store/Run.js:363`). The two `Run` atoms are not annotated and are assigned in the constructor (`Run.js:164-165`), so only `Option.value` meets the condition.
- The renderer build's handling of the same case is **not verified**. Vite documents that it reads `useDefineForClassFields` from `tsconfig.json` and defaults it to `true` for an `ESNext` target ([Vite docs, "useDefineForClassFields"](https://vite.dev/guide/features#usedefineforclassfields)); I did not run a build to confirm what `@vitejs/plugin-react` 5.2 with these Babel plugins emits for a `.ts` class.

`experimentalDecorators`:

- It is not in `tsconfig.json` any more. Annotation-map classes use no decorator syntax, so the flag has nothing to act on.
- MobX 7 does not support legacy decorators at all ([mobx CHANGELOG 7.0.0](https://github.com/mobxjs/mobx/blob/main/packages/mobx/CHANGELOG.md#700)). For its modern decorators the docs require the flag to be absent or `false` ([docs] [`enabling-decorators.md`](https://github.com/mobxjs/mobx/blob/main/docs/enabling-decorators.md)).
- MobX documents no other TypeScript compiler option. I found no documented minimum TypeScript version; the 7.x typings use the built-in `NoInfer` (CHANGELOG 7.0.4), which TypeScript added in 5.4.

## 5. MobX 7 typing changes versus MobX 6

From the [mobx CHANGELOG](https://github.com/mobxjs/mobx/blob/main/packages/mobx/CHANGELOG.md), checked against the installed typings:

- **Namespaced annotations are removed** (7.0.0). `observable.ref`, `observable.shallow`, `observable.deep`, `observable.struct`, `computed.struct`, `action.bound`, `flow.bound` become the named exports `observableRef`, `observableShallow`, `observableDeep`, `observableStruct`, `computedStruct`, `actionBound`, `flowBound`; `comparer.*` becomes `compareIdentity`, `compareDefault`, `compareStructural`, `compareShallow`. The old forms are type errors [probe]: `TS2339: Property 'ref' does not exist on type 'IObservableFactory'`, `Property 'bound' does not exist on type 'IActionFactory'`.
- **`makeObservable`'s `annotations` parameter is required.** In 6.13.7 it was optional (`annotations?:`), for the decorator form `makeObservable(this)` ([6.13.7 source](https://github.com/mobxjs/mobx/blob/mobx%406.13.7/packages/mobx/src/api/makeObservable.ts)). `AnnotationsMap` and the `AdditionalKeys` generic are unchanged between 6.13.7 and 7.1.7.
- **Legacy decorators are removed** (7.0.0); annotations double as Stage 3 decorators only (`DecoratorAnnotation`).
- **`{ proxy: false }` and `configure({ useProxies })` are removed** (7.0.0); `makeObservable`'s options type is now plain `CreateObservableOptions`.
- **`computed(fn)` returns `IComputedValue<T>` without `set()`** (7.1.0); `computed(fn, { set })` returns `IWritableComputedValue<T>`. Calling `.set()` on the former is `TS2339` [probe]. This is the function form, not the annotation.
- **`trace` is removed** (7.0.0).
- 7.0.4: `IReactionDisposer` extends `Disposable`. 7.1.1: `IWhenOptions` gains `requiresObservable`.
- `mobx-react-lite` 5 requires MobX 7 and React 18+, and removes `useObserver`, `useLocalStore`, `useAsObservableSource`, `useStaticRendering` and the batching exports (same 7.0.0 entry).
- `mobx-utils` 6.1.1 declares a `^6` peer range for `mobx`; commit `bd586b7` records that it works on MobX 7. I did not check its typings against MobX 7.

## 6. What the page store uses

Scope: non-test files in `src/app/store/` plus `src/app/promisedComputed.js`. Counted by script over the `makeObservable` maps.

- 53 classes; 47 pass their own annotation map, one `makeObservable` call each. No `makeAutoObservable`, `extendObservable`, `observable(...)` call, `flow`, `flowResult`, or `makeObservable` options argument anywhere.
- No class uses the `makeObservable<T, AdditionalKeys>` generic. No `#private` members. No annotated key starts with `_`; the two underscore members, `Part._transform` (`src/app/store/Partition.js:56`) and `StoreBase._init` (`src/app/store/StoreBase.js:43`), are unannotated public arrow fields.

Annotation kinds, 317 entries:

| Annotation | On | Count |
| --- | --- | --- |
| `computed` | getter | 164 |
| `action` | arrow-function field | 66 |
| `action` | `async` arrow-function field | 22 |
| `action` | prototype method | 3 |
| `observable` | field | 58 |
| `observableRef` | field | 1 |
| `override` | getter | 2 |
| `override` | prototype method | 1 |

Not used: `observableShallow`, `observableDeep`, `observableStruct`, `computedStruct`, `actionBound`, `flow`, `flowBound`, `true`, `false`.

The non-default cases:

- `observableRef`: `Run.showPartitionFor`, `src/app/store/Run.js:64`.
- `action` on a prototype method: `Option.setValue` and `Option.reset` (`src/app/store/Option.js:24-25`); `Alignment.dispose` (`src/app/store/Alignment.js:68`, method at `:418`), which shadows the unannotated `StoreBase.dispose` (`src/app/store/StoreBase.js:39`) and so is `action`, not `override`.
- `override`:
  - `RaxmlNgModelASC.notAvailable`, `src/app/store/AlignmentOptions.js:120`, over `RaxmlNgModelExtraParam.notAvailable: computed` at `:47`.
  - `MultistateNumber.error`, `src/app/store/AlignmentOptions.js:137`, over `Option.error: computed` at `src/app/store/Option.js:27`.
  - `OutGroup.setValue`, `src/app/store/RunOptions.js:441`, over `Option.setValue: action` at `src/app/store/Option.js:24`.
- No subclass redeclares a member that an ancestor annotated without annotating it `override` (script check over class-body declarations).

Class chains:

- `Option` (`Option.js:4`) is the base of every class in `RunOptions.js`, `AlignmentOptions.js` and `PartOptions.js`. Two-level chains: `Option` > `RaxmlNgModelExtraParam` > `RaxmlNgModelF`/`I`/`G`/`ASC`; `Option` > `PartBase` > six `Part*` classes; `Option` > `TreeFile` > `Tree`, `BackboneConstraintTree`, `MultifurcatingConstraintTree`.
- `StoreBase` (`StoreBase.js:20`, no annotations) > `InputFile` > `Alignment`, `AstralTree`; `StoreBase` > `AppStore` > `RunList`; `StoreBase` > `Config`; `StoreBase` > `Run`.
- Standalone: `Citation`, `FinalAlignment`, `FinalPartition`, `Part`, `Partition`, `PromisedComputed`.
- Classes with no map of their own: `StoreBase`, `RaxmlNgModelF`, `RaxmlNgModelI`, `RaxmlNgModelG` (`AlignmentOptions.js:72,84,96`), `Analysis`, `RaxmlNgAnalysis` (`RunOptions.js:298,305`).

Other MobX API in scope: `runInAction` (`Alignment.js:346,378`, `Config.js:14`, `Run.js:1539`, `StoreBase.js:46`), `reaction` (`Partition.js:149,160`), `createAtom` (imported at `Run.js:1`), and `fromPromise` from `mobx-utils` (`promisedComputed.js:2`). `PromisedComputed` annotates two getters `computed` (`promisedComputed.js:11-14`).

## Not verified

- What the Vite renderer build emits for a type-only class field in a `.ts` file (section 4).
- `mobx-utils` 6.1.1 typings against MobX 7 (section 5).
- The runtime error strings are quoted from source, not triggered. They exist only in development builds.
- The class-shape counts come from a line-based script, not a parser; the totals match a separate `grep` count per annotation kind (91 `action` including the one-line map at `AstralTree.js:8`, 164 `computed`, 58 `observable`, 1 `observableRef`, 3 `override`).
