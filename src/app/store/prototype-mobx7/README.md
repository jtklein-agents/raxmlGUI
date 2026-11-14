# PROTOTYPE: the page store's options without decorators, on MobX 7

Throwaway. Answers wayfinder ticket #110: what do `Option`, `OutGroup` and `MultistateNumber` look like without decorators, on `mobx` 7.1.7, with define class-field semantics? Never merged.

Run: `npm install && npm start` in this folder. Node's native class fields are define semantics, so nothing is compiled. `output.txt` is the last run.

| File | What it is |
| --- | --- |
| `a-methods.mjs` | Variant A: `makeObservable` per class; actions are prototype methods; a subclass annotates a replaced action or computed `override`. |
| `b-arrows.mjs` | Variant B: `makeObservable` per class; actions stay arrow fields; `Option.setValue` delegates to a plain `nextValue` method that `OutGroup` replaces. |
| `failures.mjs` | The shapes that do not work, each as the smallest class that shows it. |
| `dispose.mjs` | `Alignment.dispose`: an annotated arrow action over `StoreBase`'s plain arrow field. |
| `fakeRun.mjs` | Stand-in for `Run`. |

## What the run shows

- A and B behave identically for every step, react to changes, and produce no action-enforcement warnings.
- `Option.value` must be assigned in the constructor body. As a field initializer it starts as `undefined`.
- `makeAutoObservable` throws for a class with a superclass or with subclasses.
- `OutGroup.setValue` as it is today (arrow action redeclared in the subclass) throws `Cannot redefine property: setValue`.
- A subclass that replaces a parent computed must annotate it `override`; `computed` throws. Annotating nothing does not throw and the child getter runs, but that is undocumented.
- `Alignment.dispose` works unchanged: annotating an arrow action over an unannotated parent arrow field is accepted.
- A subclass with no observable members of its own needs no `makeObservable` call.

Not shown: the stand-in `Run` is a plain observable object; nothing here runs inside the app, Babel, or Jest.
