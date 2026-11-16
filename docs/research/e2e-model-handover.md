# How the app turns the ModelTest result into each binary's model

Issue #209 (map #207). Facts only. Source commit: `2bb2dc7` (master). Line numbers refer to that commit.
Measured facts come from running the shipped Mac binaries (`static/bin/Mac`, `modeltest-ng-ARM64`, `raxml-ng`, `raxmlHPC`) on `static/example-files/fasta/nucleotide.txt` (18 sequences, 678 sites).

## 1. Where the model is extracted (main process)

`src/main/modelSelection.ts` `runModelSelection`:

- Runs `modeltest-ng -d nt -i <aln> -o <outDir>/RAxML_GUI_ModelTest_<name> --force -p <threads>`.
- Splits stdout by line. ModelTest prints the "Commands:" block once per criterion (BIC, AIC, AICc). The code takes the third match, `[2]`, i.e. AICc, of lines starting with `  > raxmlHPC-SSE3` and `  > raxml-ng`.
- `modelRaxml = /-m (\S+)/` on the raxmlHPC line; `extraFlag = /--(\S+)/.exec(raxmlHPC line)?.[0]`; `modelRaxmlNG = /--model (\S+)/` on the raxml-ng line.
- Sends `ALIGNMENT_MODEL_SELECTION_SUCCESS` with `result: { raxml, extraFlag, raxmlNG }`. A parse failure sends a failure with `error.name = 'Modeltest error'`.

## 2. What ModelTest prints for the fixture (measured)

Command lines in ModelTest-NG stdout for `nucleotide.txt`:

```
AICc best: Model: TVM+I
  > raxmlHPC-SSE3 -s nucleotide.txt -c 1 -m GTRCATIX -n EXEC_NAME -p PARSIMONY_SEED
  > raxml-ng --msa nucleotide.txt --model TVM+I
```

BIC picks TPM2uf+I; AIC and AICc pick TVM+I. The raxmlHPC line has no `--XYZ` flag here, so `extraFlag` is `undefined`. The raxmlHPC line is a fixed approximation: `GTRCATIX` (GTR matrix + CAT + invariant + ML freqs), not TVM. ModelTest ranks AICc runner-ups close together (AIC delta GTR+I 0.89), so the pick can change with the ModelTest version or platform build.

## 3. raxml-ng model (renderer, `src/app/store/Alignment.js`)

`Alignment.setModelFromString` (line 344):

- Base model: `raxmlNG.split('+')[0]`, then `TrN` becomes `TN93` and `TPM1` becomes `K81`. Written to `alignment.substitutionModel` (a `RaxmlNgAlignmentSubstitutionModel`, options from `src/settings/raxmlng.ts` `nucleotideSubstitutionModelOptions`, default `GTR`; `TVM` is in the list).
- Suffixes by regex on the raxml-ng string: `+F[O|E]?` into `ngStationaryFrequencies`, `+IC?` into `ngInvariantSites`, `+GA?` into `ngRateHeterogeneity`, `+ASC_LEWIS` into `ngAscertainmentBias`. Unset suffixes keep their defaults (`<none>`).
- Note `+G4` from ModelTest matches `+G` (regex `\+GA?`), so ModelTest's `+G4` becomes the app's `+G`.
- The `--model` value is `alignment.ngSubstitutionModelCmd` (line 257) = `substitutionModel.cmdValue + F + I + G + ASC` concatenated. `Run.ngSubstitutionModelCmd` (line 1102) forwards `alignments[0].ngSubstitutionModelCmd`.
- For fixture: `TVM` + `+I` gives `TVM+I`. Same string as ModelTest's raxml-ng line.

## 4. raxmlHPC model (`Alignment.js` plus `src/app/store/Run.js`)

`setModelFromString` also parses `raxml` (`GTRCATIX`), writing run-level options (these are on `run`, not on the alignment):

- Trailing `F` sets `baseFrequencies` `F`; trailing `X` sets `estimatedFrequencies` true and `baseFrequencies` `X`; otherwise `baseFrequencies` `default`. Trailing letter is sliced off. (For `GTRCATIX`: `X`.)
- Protein only: strips and stores the matrix name.
- `substitutionAscertainment` is always set to `none`.
- Trailing `I` sets `substitutionI` to `+I (ML estimate)` and is sliced off.
- `GAMMA` sets `substitutionRate` `GAMMA`; `CAT` sets `substitutionRate` `CAT`.
- `extraFlag` `--JC69` / `--K80` / `--HKY85` sets `substitutionMatrix` `JC` / `K80` / `HKY` and forces rate `GAMMA`. Otherwise `substitutionMatrix` stays at its current value (default `GTR`).
- The `-m` value is `Run.raxmlSubstitutionModelCmd` (line 1157) = ascertainment + `substitutionMatrix.cmdValue` (JC/K80/HKY collapse to `GTR`) + `substitutionRate.cmdValue` (`GAMMA` if matrix is not GTR) + `I` + (`X` if `estimatedFrequencies`; protein: matrix name and frequency suffix). The extra flag comes from `substitutionMatrix.extraCmdValue` (line 1430 etc.).
- For fixture: `GTR` + `CAT` + `I` + `X` gives `-m GTRCATIX`, equal to ModelTest's raxmlHPC string. So the raxmlHPC model does round-trip, but it is `GTRCATIX` (a GTR approximation of TVM+I), not an equivalent of raxml-ng's `TVM+I`. There is no `GTR+G`-style translation between the two; each binary's string is taken independently from its own ModelTest line.

## 5. Command preview

The preview is `Run.command` (line 1905), rendered as `<Typography variant="body1">{run.command}</Typography>` in `src/app/Raxml.js:84`, a `<p>` element. Each arg group is `${binary.value} ${args.join(' ')}`, groups joined by ` &&\` newline.

- raxml-ng: `raxml-ng ... --model TVM+I ...` (args built in `raxmlNgArgs`, `--model` at e.g. line 1226 for `SC`, 1254 for `TI`).
- raxmlHPC: `raxmlHPC ... -m GTRCATIX ...` (`raxmlArgs`; `ML` case at line 1506: `-f d -m <model> -N <runs> -p <seed> -n <name> -s <aln> -w <dir>`). Extra flags like `--HKY85` follow `-m` when applicable.
- Both `-m` / `--model` and the seed are in the previewed text, so the e2e can read both from the preview. Existing `e2e/modeltest-then-raxml-ng.spec.js` already reads `--model (\S+)` from the preview and compares the base model with `*.raxml.bestModel.txt`.

## 6. Where the e2e can read the expected model

| Source | Value for the fixture | Notes |
| --- | --- | --- |
| Command preview `<p>` (raxml-ng) | `--model TVM+I` | Reflects UI state after ModelTest; existing test already reads it |
| Command preview `<p>` (raxmlHPC) | `-m GTRCATIX` | Only valid in the same app session after ModelTest ran |
| `static/test-results/RAxML_GUI_ModelTest_nucleotide.out` (ModelTest output files written via `-o`) | `Model: TVM+I` per criterion, "Commands:" block | Written next to the other outputs; matches the strings the app parses |
| Console output in app | `> raxml-ng`... | Existing test waits for `'> raxml-ng'` |
| `<id>.raxml.bestModel.txt` | `TVM{...}+FU{...}+IU{...}, noname = 1-678` | Measured with `--model TVM+I`; this is a result, not an expectation |

Session behaviour relevant to the e2e (from code and existing specs):

- The model fields live on the app store (`run`/`alignment`), so they persist only while the app instance is open. `e2e/raxmlHPC.spec.js` launches a fresh app, so it has no ModelTest result; its `-m` value is the default (`GTR`, `GAMMA`, no `I`, no `X`; i.e. `GTRGAMMA`).
- The default analysis for raxml-ng is `ML+TBE+con` (`RaxmlNgAnalysis`) and for raxmlHPC `ML+rBS` (`Analysis`). `ML` (raxmlHPC) and `TI` (raxml-ng) must be selected explicitly. Both appear in `haveRandomSeed` (line 1031) so the seed field is shown for them.
- Seed: `run.randomSeed` initialises randomly (`Math.floor(1e6*Math.random())`, line 1012). `setRandomSeed` accepts a nonzero number below 1e6. It is a `<TextField title="Random seed" helperText="Seed">` in `src/app/Model.js:85-96`, shown only when `haveRandomSeed`. The same value feeds raxml-ng `--seed` and raxmlHPC `-p`.

## 7. Measured: model strings do not give equal likelihoods; fixed seeds repeat

Same alignment, single run, `-p`/`--seed 1`, Mac binaries:

- raxml-ng `--model TVM+I --tree rand{1} --seed 1 --threads 2`: `Final LogLikelihood: -1184.208584`; bestModel `TVM{0.790777/1.131499/0.117326/2.568000/1.000000}+FU{0.336812/0.130574/0.147633/0.384981}+IU{0.863696}`.
- raxmlHPC `-f d -m GTRCATIX -N 1 -p 1`: log reports "Likelihood of final tree will be evaluated and optimized under GAMMA+P-Invar" and `Final GAMMA-based Score of best tree -1183.120275` (raxmlHPC optimises under GAMMA+I even when `CAT` is given; CAT is only used for the search).
- Repeating each command gave byte-identical `bestTree` (raxml-ng) and `RAxML_bestTree` (raxmlHPC). Only these two repeats were checked, with `--threads 2` for raxml-ng and no threads for raxmlHPC.
- raxml-ng and raxmlHPC likelihoods are not directly comparable here (different models, different rate treatment), so each needs its own fixture, as the map already assumes.

## Not checked

- Windows and Linux binaries (no Windows ModelTest line format check; Windows ships no raxml-ng).
- Whether ModelTest's pick is stable across platform builds or thread counts.
- AVX / PTHREADS raxmlHPC variants.
- Other data types (protein, binary, multistate).
