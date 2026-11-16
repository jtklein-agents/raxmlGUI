# Page TypeScript inventory

Research for #226 (map #225). Facts only, measured on `master` at `b0d2729` with MobX 7.1.7 and TypeScript 5.9.3. Every claim cites the repo file or the command that produced it.

## In-scope set

40 files, 7,976 lines: the production (non-test) `.js` files under `src/app`, plus `src/preload/index.js`, `src/common/fastaParser.js`, `src/common/phylipParser.js`, and `src/common/typecheckAlignment.js`.

14 of the 40 hold JSX (a rename target of `.tsx`); the other 26 hold none. The **JSX** column in the first table marks them.

## Method

- Import graph: a regex scan of every `import … from`, bare `import`, `require(`, `import(`, and `jest.mock(` specifier in `src/**/*.{js,jsx,ts,tsx}`, each relative specifier resolved against the files on disk. Every relative specifier into `src` resolved.
- Order: Tarjan strongly connected components over in-scope edges, then **Depth** = longest import chain down to a file with no in-scope import. A file at depth *n* imports in-scope files only at depths below *n*.
- Diagnostics: `npx tsc --noEmit --pretty false` and `npx tsc --noEmit --pretty false --noImplicitAny`, counting `file(line,col): error TS…` header lines per file. **Extra** is the second count minus the first.
- Package types: for each bare specifier, the package's `package.json` `types`/`typings`/`exports` and the presence of `node_modules/@types/<name>`, cross-checked against `TS7016` in the `--noImplicitAny` run.

## 1. Import graph and leaf-first order

**No import cycles.** Every strongly connected component has one file, and no file imports itself. `.eslintrc.cjs:8` also holds `import/no-cycle` at `error`.

### Leaf-first order, with diagnostics

Rows are sorted by depth, then path. Any order that keeps depth non-decreasing is a valid leaf-first order. **Baseline** is the file's diagnostic count under plain `tsc` (these are the entries in `scripts/typecheck-baseline.txt`). The `TS…` columns split **Extra** by code.

| # | Depth | File | JSX | Lines | Baseline | Extra | TS2339 | TS7005 | TS7006 | TS7008 | TS7016 | TS7018 | TS7019 | TS7031 | TS7034 | TS7053 |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| 1 | 0 | `src/app/AlignmentCard.js` | yes | 458 | 0 | 9 |  |  | 5 |  |  |  |  | 4 |  |  |
| 2 | 0 | `src/app/AstralTreeCard.js` | yes | 130 | 0 | 3 |  |  | 2 |  |  |  |  | 1 |  |  |
| 3 | 0 | `src/app/CitationModal.js` | yes | 95 | 0 | 3 |  |  | 2 |  |  |  |  | 1 |  |  |
| 4 | 0 | `src/app/Console.js` | yes | 81 | 0 | 1 |  |  |  |  |  |  |  | 1 |  |  |
| 5 | 0 | `src/app/Model.js` | yes | 139 | 0 | 1 |  |  |  |  |  |  |  | 1 |  |  |
| 6 | 0 | `src/app/PartitionEditor.js` | yes | 234 | 0 | 6 |  |  | 4 |  |  |  |  | 2 |  |  |
| 7 | 0 | `src/app/PartitionFileCard.js` | yes | 92 | 0 | 1 |  |  |  |  |  |  |  | 1 |  |  |
| 8 | 0 | `src/app/paths.js` | no | 61 | 0 | 9 |  |  | 7 |  |  |  | 1 | 1 |  |  |
| 9 | 0 | `src/app/promisedComputed.js` | no | 38 | 0 | 4 |  |  | 4 |  |  |  |  |  |  |  |
| 10 | 0 | `src/app/Raxml.js` | yes | 97 | 0 | 2 |  |  |  |  |  |  |  | 2 |  |  |
| 11 | 0 | `src/app/report.js` | no | 61 | 0 | 6 |  |  | 6 |  |  |  |  |  |  |  |
| 12 | 0 | `src/app/store/Citation.js` | no | 219 | 0 | 2 |  |  | 1 |  |  |  |  |  |  | 1 |
| 13 | 0 | `src/app/store/FinalPartition.js` | no | 43 | 0 | 6 |  | 1 | 4 |  |  |  |  |  | 1 |  |
| 14 | 0 | `src/app/store/host.js` | no | 5 | 0 | 0 |  |  |  |  |  |  |  |  |  |  |
| 15 | 0 | `src/app/store/Option.js` | no | 76 | 1 | 1 |  |  | 1 |  |  |  |  |  |  |  |
| 16 | 0 | `src/app/store/StoreBase.js` | no | 51 | 0 | 4 |  |  | 3 | 1 |  |  |  |  |  |  |
| 17 | 0 | `src/app/TreeCard.js` | yes | 107 | 0 | 4 |  |  | 2 |  |  |  |  | 2 |  |  |
| 18 | 0 | `src/common/fastaParser.js` | no | 85 | 0 | 10 |  | 4 | 4 |  |  |  |  |  | 2 |  |
| 19 | 0 | `src/common/phylipParser.js` | no | 177 | 0 | 11 |  | 1 | 9 |  |  |  |  |  | 1 |  |
| 20 | 0 | `src/common/typecheckAlignment.js` | no | 147 | 0 | 16 |  | 3 | 11 |  |  |  |  |  | 2 |  |
| 21 | 0 | `src/preload/index.js` | no | 186 | 0 | 46 |  | 2 | 41 |  |  |  |  | 2 | 1 |  |
| 22 | 1 | `src/app/githubIssue.js` | no | 29 | 0 | 4 |  |  | 4 |  |  |  |  |  |  |  |
| 23 | 1 | `src/app/Input.js` | yes | 428 | 0 | 15 |  |  | 14 |  |  |  |  | 1 |  |  |
| 24 | 1 | `src/app/Output.js` | yes | 105 | 0 | 2 |  |  | 1 |  |  |  |  | 1 |  |  |
| 25 | 1 | `src/app/store/AlignmentOptions.js` | no | 160 | 3 | 16 | 5 |  | 10 |  |  |  |  |  |  | 1 |
| 26 | 1 | `src/app/store/Config.js` | no | 41 | 0 | 2 |  |  | 2 |  |  |  |  |  |  |  |
| 27 | 1 | `src/app/store/FinalAlignment.js` | no | 224 | 0 | 8 |  |  | 4 |  | 2 |  |  | 2 |  |  |
| 28 | 1 | `src/app/store/InputFile.js` | no | 64 | 0 | 3 |  |  | 2 | 1 |  |  |  |  |  |  |
| 29 | 1 | `src/app/store/PartOptions.js` | no | 179 | 0 | 12 |  |  | 11 |  |  |  |  | 1 |  |  |
| 30 | 1 | `src/app/store/RunOptions.js` | no | 873 | 18 | 89 | 57 |  | 27 |  | 1 |  | 3 |  |  | 1 |
| 31 | 2 | `src/app/components/ErrorDialog.js` | yes | 180 | 0 | 4 |  |  |  |  |  |  |  | 4 |  |  |
| 32 | 2 | `src/app/store/AppStore.js` | no | 32 | 0 | 1 |  |  |  | 1 |  |  |  |  |  |  |
| 33 | 2 | `src/app/store/AstralTree.js` | no | 15 | 0 | 1 |  |  |  |  |  |  | 1 |  |  |  |
| 34 | 2 | `src/app/store/Partition.js` | no | 260 | 0 | 13 |  |  | 6 | 1 |  |  |  | 6 |  |  |
| 35 | 3 | `src/app/store/Alignment.js` | no | 463 | 0 | 26 |  |  | 6 | 6 |  |  |  | 12 |  | 2 |
| 36 | 4 | `src/app/store/Run.js` | no | 1675 | 0 | 59 |  | 7 | 23 | 6 | 1 | 1 |  | 14 | 7 |  |
| 37 | 5 | `src/app/store/RunList.js` | no | 105 | 0 | 12 |  |  | 7 | 3 |  |  |  | 2 |  |  |
| 38 | 6 | `src/app/store/index.js` | no | 8 | 1 | 0 |  |  |  |  |  |  |  |  |  |  |
| 39 | 7 | `src/app/App.js` | yes | 518 | 3 | 2 |  |  | 2 |  |  |  |  |  |  |  |
| 40 | 8 | `src/app/index.js` | yes | 35 | 0 | 0 |  |  |  |  |  |  |  |  |  |  |

Depth totals: 21 files at depth 0, 9 at depth 1, 4 at depth 2, then one file each at depths 3 to 8. The single chain from depth 3 up is `store/Alignment.js` → `store/Run.js` → `store/RunList.js` → `store/index.js` → `App.js` → `index.js`.

### Edges

Paths are relative to `src/`. **Imports (repo)** lists every repo file the row imports, in or out of scope. `src/app/index.js` is imported by `src/index.tsx:4` as the directory `./app/`. `src/preload/index.js` has no importer; electron-vite finds it by path (section 4). `jest/setup.js:3` and `jest/storeBridge.js:4` also import `src/app/store/StoreBase` (extensionless), outside `src`.

| File | Imports (repo) | Imported by (production) | Imported by (tests) |
| --- | --- | --- | --- |
| `src/app/AlignmentCard.js` | `app/components/OptionSelect.tsx`, `app/components/OptionTextField.tsx` | `app/Input.js` | none |
| `src/app/AstralTreeCard.js` | none | `app/Input.js` | none |
| `src/app/CitationModal.js` | `app/components/CodeHighlight.tsx` | `app/App.js` | none |
| `src/app/Console.js` | none | `app/App.js` | none |
| `src/app/Model.js` | `app/components/OptionSelect.tsx`, `app/components/OptionCheck.tsx` | `app/App.js` | none |
| `src/app/PartitionEditor.js` | `app/components/OptionTextField.tsx`, `app/components/OptionSelect.tsx` | `app/App.js` | none |
| `src/app/PartitionFileCard.js` | none | `app/Input.js` | none |
| `src/app/paths.js` | none | `app/Output.js`, `app/bootstrap.ts`, `app/store/FinalAlignment.js`, `app/store/InputFile.js`, `app/store/Run.js`, `app/store/RunOptions.js` | `app/paths.test.js` |
| `src/app/promisedComputed.js` | none | `app/store/Run.js` | `app/promisedComputed.test.js` |
| `src/app/Raxml.js` | `app/components/OptionSelect.tsx` | `app/App.js` | none |
| `src/app/report.js` | none | `app/components/ErrorDialog.js`, `app/githubIssue.js` | `app/report.test.js` |
| `src/app/store/Citation.js` | none | `app/store/AppStore.js` | none |
| `src/app/store/FinalPartition.js` | none | `app/store/FinalAlignment.js` | none |
| `src/app/store/host.js` | none | `app/store/Alignment.js`, `app/store/Run.js`, `app/store/RunOptions.js` | none |
| `src/app/store/Option.js` | none | `app/store/AlignmentOptions.js`, `app/store/PartOptions.js`, `app/store/RunOptions.js` | `app/store/Option.test.js` |
| `src/app/store/StoreBase.js` | none | `app/store/Alignment.js`, `app/store/AppStore.js`, `app/store/Config.js`, `app/store/InputFile.js`, `app/store/Run.js`, `app/store/RunList.js` | `app/store/InputFile.test.js`, `app/store/OutGroup.test.js`, `app/store/Partition.test.js`, `app/store/Run.computeds.test.js`, `app/store/RunList.test.js`, `app/store/alignmentStore.test.js`, `app/store/astral.test.js`, `app/store/modelSelection.test.js`, `app/store/runLifecycle.test.js`, `app/store/startRun.test.js` |
| `src/app/TreeCard.js` | none | `app/Input.js` | none |
| `src/common/fastaParser.js` | `common/errors.ts` | `common/io.ts` | none |
| `src/common/phylipParser.js` | `common/errors.ts` | `common/io.ts` | none |
| `src/common/typecheckAlignment.js` | `common/errors.ts` | `app/store/Alignment.js`, `app/store/FinalAlignment.js`, `common/io.ts` | none |
| `src/preload/index.js` | `constants/ipc.ts` | none | none |
| `src/app/githubIssue.js` | `app/report.js` | `app/components/ErrorDialog.js` | none |
| `src/app/Input.js` | `app/AlignmentCard.js`, `app/AstralTreeCard.js`, `app/PartitionFileCard.js`, `app/TreeCard.js` | `app/App.js` | `app/droppedFile.test.js` |
| `src/app/Output.js` | `app/paths.js` | `app/App.js` | none |
| `src/app/store/AlignmentOptions.js` | `app/store/Option.js`, `settings/raxmlng.ts` | `app/store/Alignment.js` | none |
| `src/app/store/Config.js` | `app/store/StoreBase.js` | `app/store/AppStore.js` | none |
| `src/app/store/FinalAlignment.js` | `app/store/FinalPartition.js`, `common/typecheckAlignment.js`, `app/paths.js` | `app/store/Run.js` | none |
| `src/app/store/InputFile.js` | `app/paths.js`, `app/store/StoreBase.js` | `app/store/Alignment.js`, `app/store/AstralTree.js` | `app/paths.test.js`, `app/store/InputFile.test.js` |
| `src/app/store/PartOptions.js` | `app/store/Option.js`, `settings/raxml.ts` | `app/store/Partition.js` | `app/store/Part.test.js` |
| `src/app/store/RunOptions.js` | `app/store/Option.js`, `app/store/host.js`, `app/paths.js`, `settings/raxml.ts` | `app/store/Run.js` | `app/store/Run.computeds.test.js`, `app/store/RunSimpleOptions.test.js` |
| `src/app/components/ErrorDialog.js` | `app/report.js`, `app/githubIssue.js` | `app/App.js`, `app/components/ErrorBoundary.tsx` | `app/components/ErrorDialog.test.js` |
| `src/app/store/AppStore.js` | `app/store/StoreBase.js`, `app/store/Citation.js`, `app/store/Config.js` | `app/store/RunList.js` | `app/store/RunList.test.js`, `app/store/citationConfig.test.js`, `app/store/version.test.js` |
| `src/app/store/AstralTree.js` | `app/store/InputFile.js` | `app/store/Run.js` | `app/store/InputFile.test.js` |
| `src/app/store/Partition.js` | `app/store/PartOptions.js` | `app/store/Alignment.js` | none |
| `src/app/store/Alignment.js` | `settings/raxml.ts`, `settings/raxmlng.ts`, `app/store/Partition.js`, `app/store/InputFile.js`, `app/store/AlignmentOptions.js`, `app/store/StoreBase.js`, `common/typecheckAlignment.js`, `common/errors.ts`, `app/store/host.js` | `app/store/Run.js` | `app/store/Part.test.js`, `app/store/Partition.test.js`, `app/store/host.test.js` |
| `src/app/store/Run.js` | `app/promisedComputed.js`, `app/store/Alignment.js`, `app/store/FinalAlignment.js`, `app/store/AstralTree.js`, `app/store/StoreBase.js`, `app/store/host.js`, `app/store/RunOptions.js`, `app/paths.js`, `common/errors.ts` | `app/store/RunList.js` | `app/store/AlignmentOptions.test.js`, `app/store/Part.test.js`, `app/store/Run.computeds.test.js`, `app/store/RunSimpleOptions.test.js`, `app/store/alignmentStore.test.js`, `app/store/astral.test.js`, `app/store/cancelRun.test.js`, `app/store/checkOutputName.test.js`, `app/store/finalAlignment.test.js`, `app/store/host.test.js`, `app/store/loadAlignment.test.js`, `app/store/loadAstralTree.test.js`, `app/store/loadPartitionFile.test.js`, `app/store/loadTree.test.js`, `app/store/modelSelection.test.js`, `app/store/openPath.test.js`, `app/store/pageStoreGaps.test.js`, `app/store/parseAlignment.test.js`, `app/store/readText.test.js`, `app/store/runInputActions.test.js`, `app/store/runLifecycle.test.js`, `app/store/selectOutputDir.test.js`, `app/store/showItemInFolder.test.js`, `app/store/startRun.test.js`, `app/store/substitutionOptions.test.js`, `app/store/treeFileOptions.test.js`, `app/store/writeConcatenatedAlignment.test.js` |
| `src/app/store/RunList.js` | `app/store/Run.js`, `app/store/AppStore.js`, `app/store/StoreBase.js` | `app/store/index.js` | `app/store/OutGroup.test.js`, `app/store/Partition.test.js`, `app/store/RunList.test.js`, `app/store/menu.test.js`, `app/store/pageStoreGaps.test.js` |
| `src/app/store/index.js` | `app/store/RunList.js` | `app/App.js`, `app/bootstrap.ts`, `app/index.js` | `app/bootstrap.test.js`, `app/store/provideStateReport.test.js`, `app/unhandledError.test.js` |
| `src/app/App.js` | `app/Model.js`, `app/Input.js`, `app/Output.js`, `app/Raxml.js`, `app/Console.js`, `app/store/index.js`, `app/PartitionEditor.js`, `app/CitationModal.js`, `app/components/ErrorBoundary.tsx`, `app/components/ErrorDialog.js`, `app/components/ModifiedDialog.tsx` | `app/index.js` | none |
| `src/app/index.js` | `app/theme/index.ts`, `app/App.js`, `app/components/ErrorBoundary.tsx`, `app/store/index.js`, `app/bootstrap.ts` | `index.tsx` | `app/App.test.js`, `app/unhandledError.test.js` |

## 2. Diagnostics under `--noImplicitAny`

| Run | Diagnostics |
| --- | --- |
| `tsc --noEmit --pretty false` | 26, all in 5 in-scope files |
| `tsc --noEmit --pretty false --noImplicitAny` | 475 |
| Extra, whole program | 449 |
| Extra, in-scope files | **414** |
| Extra, out-of-scope files | 35 |

Heaviest in-scope files by extra diagnostics: `store/RunOptions.js` 89, `store/Run.js` 59, `preload/index.js` 46, `store/Alignment.js` 26, `store/AlignmentOptions.js` 16, `common/typecheckAlignment.js` 16, `Input.js` 15. Those seven hold 267 of the 414. Three files gain none: `store/host.js`, `store/index.js`, `index.js`.

Extra diagnostics by code, in-scope files:

| Code | Meaning | Count |
| --- | --- | --- |
| TS7006 | Parameter implicitly `any` | 225 |
| TS2339 | Property does not exist on type | 62 |
| TS7031 | Binding element implicitly `any` | 61 |
| TS7008 | Member implicitly `any` | 19 |
| TS7005 / TS7034 | Variable implicitly `any` / `any[]` | 18 / 14 |
| TS7053 | Element implicitly `any` (index expression) | 5 |
| TS7019 | Rest parameter implicitly `any[]` | 5 |
| TS7016 | No declaration file for module | 4 |
| TS7018 | Object literal property implicitly `any` | 1 |

The 62 `TS2339` lines are all in `store/RunOptions.js` (57) and `store/AlignmentOptions.js` (5). 61 read `Property '<name>' does not exist on type 'Object'`: the option subclasses read `this.run.<name>`, `this.run` is assigned at `src/app/store/Option.js:31` from the constructor parameter documented as `@param {Object} run` (`Option.js:7`), and TypeScript reads a JSDoc `Object` as `any` only while `noImplicitAny` is off. The other one is `Property 'initial' does not exist` on the binaries union in `RunOptions.js`.

The out-of-scope 35: `scripts/typecheck-baseline.js` 24 (pulled in by `src/typecheckBaseline.test.js:1`), `src/main/parseAlignment.test.js` 4, `src/sourceMaps.test.js` 3, `src/pageNodeImports.test.js` 2, `src/main/modelSelection.ts` 2 (one is `TS7016` for `parse-filepath`).

Two facts bound what the counts mean for a `.ts` file:

- The in-scope files carry 47 JSDoc `@param`/`@type`/`@returns` lines (13 in `store/Run.js`, 6 each in `store/Option.js` and `store/FinalAlignment.js`). `tsc` reads them as types in a `.js` file and ignores them in a `.ts` file, so a renamed file can report more implicit-`any` lines than its row here.
- Twelve panel files assign `propTypes` (14 assignments). In a `.js` file `tsc` infers component props from them.

### Baseline entries

`scripts/typecheck-baseline.txt` has 31 lines holding 26 diagnostics. All 26 sit in in-scope files:

| File | Diagnostics | Baseline lines | Codes |
| --- | --- | --- | --- |
| `src/app/App.js` | 3 | 1–8 | TS2769 (SvgIcon `title`), TS2739, TS2741 (`ErrorDialog` props `needReload`, `title`) |
| `src/app/store/AlignmentOptions.js` | 3 | 9–11 | TS2554 (`Option` constructor arity) |
| `src/app/store/index.js` | 1 | 12 | TS2551 (`window.store`) |
| `src/app/store/Option.js` | 1 | 13 | TS2304 (`yup` name in JSDoc, line 12) |
| `src/app/store/RunOptions.js` | 18 | 14–31 | TS2554 (`Option` constructor arity) |

All 21 `TS2554` lines come from the one constructor at `src/app/store/Option.js:14-21`, whose `description` and `hoverInfo` parameters callers omit.

## 3. Third-party packages without types

Two packages, four import sites. Neither ships declarations and neither has an `@types/*` package installed; each raises `TS7016` under `--noImplicitAny`.

| Package | Version | Import sites |
| --- | --- | --- |
| `lodash` | 4.18.1 | `src/app/store/FinalAlignment.js:2` (`lodash/union`), `src/app/store/FinalAlignment.js:3` (`lodash/intersection`), `src/app/store/Run.js:39` (`lodash/remove`) |
| `d3-array` | 3.2.5 | `src/app/store/RunOptions.js:2` (`range`) |

Every other package the in-scope files import resolves to types: `@mui/material`, `@mui/icons-material`, `@sentry/electron`, `allotment`, `electron`, `filenamify`, `mobx`, `mobx-react-lite`, `mobx-utils`, `react-dropzone`, `serialize-error`, and `yup` ship their own; `react` uses `@types/react` (`package.json` devDependencies). `prop-types` resolves through `@types/prop-types`, which is installed only as a transitive dependency (`yarn.lock:3350`), not listed in `package.json`. `allotment/dist/style.css` is covered by `src/css.d.ts`.

## 4. Fixed paths and extensions that break on a rename

### Breaks

| Where | What it does | Breaks when |
| --- | --- | --- |
| `src/pageNodeImports.test.js:41` | `readFileSync` of `app/store/Alignment.js` | `store/Alignment.js` is renamed |
| `src/pageNodeImports.test.js:42` | `readFileSync` of `app/store/Run.js` | `store/Run.js` is renamed |
| `src/pageNodeImports.test.js:46` | `readFileSync` of `app/index.js` | `app/index.js` is renamed |
| `scripts/page-store-coverage.js:12` | Lists store files with `f.endsWith( '.js' )` | Any `store/*.js` rename drops that file from the list |
| `scripts/page-store-coverage.js:19` | `--collectCoverageFrom=src/app/store/*.js` | Any `store/*.js` rename drops that file from coverage |
| `scripts/typecheck-baseline.txt:1-31` | Each line begins with the `.js` path | The five files above: a rename leaves the old line unused and the diagnostic fresh at the new path, and `yarn typecheck:baseline` (CI, `.github/workflows/lint.yaml:27`) fails on either. `scripts/typecheck-baseline.js:89-95` has a `--rename <old> <new>` mode that repoints matching lines |

### Changes behaviour without breaking

| Where | What it does | Effect of a rename |
| --- | --- | --- |
| `.eslintrc.cjs:37` | Override for `**/*.{ts,tsx}`: `consistent-type-imports`, `consistent-type-definitions` (interface), `array-type`, `import/consistent-type-specifier-style`, `@typescript-eslint/no-unused-vars` | Applies to every renamed file |
| `.eslintrc.cjs:74` | Override for `src/main/**` and `src/common/**` `.ts`/`.tsx`: `explicit-module-boundary-types`, annotated catch bindings, no `instanceof Error` in a catch | Applies to the three `src/common` parsers once renamed. It does not cover `src/app` or `src/preload` |
| `electron.vite.config.js:43-47` | `moduleTypes: { '.js': 'jsx' }` for the dependency scanner | Stops applying to a renamed file. `.tsx` is parsed as JSX natively; a `.ts` file holding JSX is not |
| `electron.vite.config.js:50-59` | `@vitejs/plugin-react` `babel` option, kept (comment at line 50-51) to compile JSX in `.js` | Still runs on `.tsx` |

### Checked and not affected

- `src/preload/index.js` → `.ts`: `electron.vite.config.js:27-31` names no preload entry. electron-vite 6.0.0 finds it with `findLibEntry`, which tries `src/preload/index.{js,ts,mjs,cjs}` in that order (`node_modules/electron-vite/dist/chunks/lib-DoUt4oMD.js:314-324`). `src/preload.test.js:8,61-62` and `src/main/index.ts:47` read the built `out/preload/index.js`, not the source.
- `electron.vite.config.js:63-67`: the page entry is `index.html`, and `index.html:11` loads `/src/index.tsx`, which imports `./app/` with no extension (`src/index.tsx:4`).
- `jest.config.js:7-8`: the transform regex and `moduleFileExtensions` already include `ts` and `tsx`; `jest/babelTransform.js:10` loads `@babel/preset-typescript`. `jest.config.js` names no in-scope file.
- `src/pageNodeImports.test.js:20`: the walk already matches `js|jsx|ts|tsx`.
- `package.json` `lint` and `lint:fix` glob `src/**/*.{js,jsx,ts,tsx}`; `typecheck` runs over `tsconfig.json` `include: ["src"]`. No script names an in-scope file.
- No import, `require`, or `jest.mock` specifier anywhere in `src`, `jest`, `e2e`, or `scripts` ends in `.js`; every importer listed in section 1 is extensionless.
- `src/app/report.test.js:6,15,23,29` holds `src/app/report.js` inside stack-trace fixture strings. It does not open the file.
- `GLOSSARY.md:20` names `src/app/paths.js` in prose, and `src/app/store/Run.js:1448` names `Input.js` in a comment.
- There is no `src/packagingBridge.test.js` on `master`.

## Other observations

- `scripts/page-store-coverage.js:50-51` finds members by `@computed`/`@action`/`@observable` decorators. The page store on `master` has none: 16 store files call `makeObservable` with annotation maps, and a grep for a line starting with one of those decorators under `src/app` returns nothing. No `package.json` script or workflow runs this script.
- `src/app/store/index.js:6` reads `rendererBridge` through `/** @type {any} */ ( window )`, and line 5 writes `window.store` (the `TS2551` baseline line).
- `src/app/store/Option.js:2` imports `mixed` from `yup`, while the JSDoc at line 12 uses the bare name `yup` as a type (the `TS2304` baseline line).
