# Seed and thread determinism of the shipped binaries

Question (#208, map #207): for ModelTest, raxml-ng and raxmlHPC run from the app on `static/example-files/fasta/nucleotide.txt` (18 taxa), does the UI expose a seed field for each and does the app pass it? Does a pinned seed give the same result run to run, with the app's thread count and the binary's own parallelism? Which settings must the e2e fix?

This note records facts. Code facts cite `src/app/store/Run.js`, `src/app/Model.js` and `src/main/modelSelection.ts` at commit 2bb2dc7. Binary facts are from each binary's own `--help` text and from runs of the shipped macOS arm64 binaries in `static/bin/Mac` (raxml-ng 1.2.2, raxmlHPC 8.2.12, modeltest-ng 0.1.7, 10 CPUs). "Same" below means byte-identical files unless a likelihood is quoted. Linux and Windows binaries were not run.

## What the app does

- **Seed field.** One field, `Model.js` lines 85-95, labelled "Seed", shown only when `run.haveRandomSeed` (`Run.js` `haveRandomSeed`). That list holds `FT ML ML+rBS ML+tBS BS+con PD RBS TI ML+tBS+con ML+TBE+con`. The value is `run.randomSeed`, initialised to `Math.floor(1000000 * Math.random())`. `setRandomSeed` accepts a number that is nonzero and below 1e6; anything else is ignored silently.
- **ModelTest: no seed field and no seed argument.** `modeltestNgArgs` and `modelSelection.ts` build `-d -i -o --force -p <threads>` only. The "Run ModelTest" button (`run-modeltest`) is separate from the analysis, so the seed field is not tied to it.
- **raxml-ng:** `TI` pushes `--seed`, `--threads`, `--tree rand{<Runs>}`. `ML+TBE+con` (the app's default raxml-ng analysis, `NumRepetitionsNg` default 100) pushes `--all --seed --threads --bs-metric tbe --tree rand{<Runs>} --bs-trees <Reps>`. `--threads` is pushed whenever `numThreads` is available, which is always for raxml-ng. `Runs` (`NumRuns`) defaults to 1.
- **raxmlHPC `ML` (`-f d`):** pushes `-T <threads>` only if the selected binary name contains `PTHREADS`, then `-f d -m <model> -N <Runs> -p <seed>`. The serial `raxmlHPC` gets no `-T`. `ML+rBS` pushes `-x <seed> -p <seed>`; `ML+tBS` pushes `-b <seed>` and `-p <seed>`.
- **Thread default.** `NumThreads` default is 2 (`Run.js` `super(run, 2, 'Threads', ...)`); options are 1 to `navigator.hardwareConcurrency`. The app does not set a thread count other than this selector, so the machine's CPU count never enters a command line.
- **Model filled in from ModelTest.** `modelSelection.ts` takes the third `> raxmlHPC-SSE3` and `> raxml-ng` lines of the modeltest-ng stdout (the AICc block) and parses `-m <model>` and `--model <model>`. On this alignment: raxml-ng `--model TVM+I`, raxmlHPC `-m GTRCATIX`.

## ModelTest-ng

Binary facts: `modeltest-ng -h` lists `-r, --rngseed seed`. The output file prints `RNG seed:`; with no `-r` it printed `12345`, so the default is a fixed seed, not time-based. The default starting topology is `fixed-mp` (parsimony, `-t` help text).

Measured, `-d nt -i nucleotide.txt --force`, runs repeated twice each:

| Setting | Result |
|---|---|
| `-p 1`, `-p 2`, `-p 4`, with `-r 7` | Same results in every run. Output files differ only in the lines naming the log/tree/result file paths and the `threads:` line. |
| `-p 2`, no `-r` (what the app runs), 3 runs | Same, same differences only. |

Selected models (all runs): BIC `TPM2uf+I`, AIC `TVM+I`, AICc `TVM+I`. The starting tree written to `.tree` was the same for all runs and thread counts, with every branch length 0.100000. The `.out` file also contains timing lines and absolute paths, so a fixture must not hold the file whole.

## raxml-ng

Binary facts: `--seed VALUE` "seed for pseudo-random number generator (default: current time)"; `--threads VALUE` "(default: 10)"; `--workers` "number of tree searches to run in parallel (default: 1)". The log prints `random seed: <n>`.

Measured with `--msa nucleotide.txt --model TVM+I`, `--seed 7`:

| Command shape | Threads | Repeat | Result |
|---|---|---|---|
| `--tree rand{1}` (the app's `TI` default) | 1, 2, 4 | 2 each | Same best tree (same bytes) and final log-likelihood -1184.947937 in all six runs. |
| `--tree rand{10}` | 1, 4 | 1 each | Same best tree and -1184.195375. |
| `--all --bs-metric fbp,tbe --bs-trees 100` (default seed 7) | 1, 2, 4 | 2 each | Same best tree (-1184.194181) and same `.bootstraps` file in all six runs. |
| `--tree rand{1}`, `--seed 8` | 2 | 1 | Different tree, -1184.196235. |
| `--tree rand{1}`, no `--seed`, runs 2 s apart | 2 | 2 | Different trees, -1185.682575 and -1184.202671; the log seed was the clock time (1794826239, 1794826241). |

So the seed alone fixes the output across 1, 2 and 4 threads on this alignment, and a different seed moves the optimum (likelihood differences near 1e-3 up to 1.5, different topology). The `.raxml.bestTree` branch lengths are written with 6 decimals; many are 0.000001.

File names: the `--all --bs-metric fbp,tbe` run I made wrote `.raxml.supportFBP` and `.raxml.supportTBE`, and no `.raxml.support`. The app's own `--bs-metric tbe` shape was not run here, so the support-file name for the app's command is unverified.

## raxmlHPC

Binary facts: `-p` "Specify a random number seed for the parsimony inferences. This allows you to reproduce your results"; `-x` "random seed and turn on rapid bootstrapping"; `-T` "PTHREADS VERSION ONLY!".

Measured, `-f d -m GTRCATIX -N 1 -p 7 -s nucleotide.txt`, two runs each:

| Binary | `-T` | Repeat | Final GAMMA-based score of best tree | Best tree |
|---|---|---|---|---|
| `raxmlHPC` (serial) | none | same in both runs | -1183.121218 | same bytes both runs |
| `raxmlHPC-PTHREADS-SSE3` | 2 | same in both | -1087.343911 | same bytes both runs |
| `raxmlHPC-PTHREADS-SSE3` | 4 | same in both | -1086.627488 | same bytes both runs |
| `raxmlHPC-PTHREADS-AVX` | 4 | one run | -1086.627488 | same topology as SSE3 `-T 4` (RF 0), file bytes differ |

- Serial `-p 8`: -1183.084653, different topology (RF 8 from `-p 7`). `-m GTRGAMMAIX` with `-p 7`: -1183.140132.
- Topologies of serial, `-T 2` and `-T 4` runs differ from each other (RF distance of the best trees: 6 to 12; I counted differing non-trivial splits with a small script).
- `-N 10 -p 7` serial, two runs: same bytes, -1183.119895.
- Rapid bootstrap `-f a -x 7 -p 7 -N 20`, serial, two runs: same `bestTree` and `bipartitions` bytes.
- The best-tree files carry 18-digit branch lengths. The scores of the PTHREADS runs (about -1087) are far above the serial score for the same model string; I did not find the cause, so a PTHREADS fixture cannot be compared with a serial one.

Conclusion for raxmlHPC: with a pinned seed, output repeats for a fixed binary and a fixed `-T`, and changes with `-T` and across binaries. The serial `raxmlHPC` (no `-T`) is the binary the existing spec picks, so no thread setting applies to it.

## Settings the e2e must fix

- **ModelTest:** nothing seed-related is needed; the app passes none and the result was stable across `-p 1`, `2` and `4` on this alignment. The selected model, AICc `TVM+I` (raxml-ng) and `GTRCATIX` (raxmlHPC), is the same as read from the log.
- **raxml-ng:** pin the seed in the UI. Threads do not change the output here, so the 2-thread default may stay. Keep Runs at 1 for `TI` and fix Reps for any bootstrap analysis, because Reps changes the file set and the bootstraps. Different `Runs` values reached different optima with seed 7, so Runs is part of the fixture key.
- **raxmlHPC:** pin the seed and use the serial `raxmlHPC` (no `-T`), or pin both the PTHREADS binary and the thread selector. Pin Runs (`-N`).
- **Platform:** these numbers are from macOS arm64 only. Fixtures per platform (map decision) still stand; the AVX/SSE3 difference was only checked for PTHREADS, where the topology matched and the bytes did not.
- **Seed value:** use a nonzero integer below 1e6, which is what the field accepts.

## Not checked

Linux and Windows binaries; raxml-ng `--workers`; whether file-by-file stability holds across a different CPU (SIMD) on the same OS; the cause of the PTHREADS score gap; the exact filenames the app renames to after `--all --bs-metric tbe`.
