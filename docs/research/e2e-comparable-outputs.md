# What the three binaries write that an e2e fixture can compare

Research for #210 (map #207). Facts only. "Measured" means run on this machine (macOS arm64, Apple M4) with the bundled `static/bin/Mac` binaries on `static/example-files/fasta/nucleotide.txt` (18 taxa `TAXON_*`, 678 sites, 43 patterns), with the flags `src/app/store/Run.js` builds. Not measured: Linux and Windows output.

Versions (measured, `--version` / banner): ModelTest-NG 0.1.7, RAxML-NG 1.2.2 (30.04.2024), RAxML 8.2.12 (`raxmlHPC`). Windows binaries per `src/app/store/Run.js` binary list: `modeltest-ng.exe` 0.1.7, `raxmlHPC*.exe` 8.2.12, no raxml-ng.

## 1. What the app passes (seed and threads)

- ModelTest (`src/main/modelSelection.ts`): `-d nt -i <aln> -o <outDir>/RAxML_GUI_ModelTest_<alignment file name> --force -p <threads>`. The output prefix uses the alignment file name (`nucleotide`), not the output id. The app passes no seed. ModelTest prints `RNG seed: 12345` in its header even without one, so it has a fixed default (measured).
- raxml-ng, "ML tree inference" (`TI`, `Run.js` `raxmlNgArgs`): `--msa <aln> --model <ngSubstitutionModelCmd> --prefix <outDir>/<outputId> [--threads N] --seed <seed> --tree rand{<runs>}`. `--threads` is omitted unless the binary name contains `PTHREADS` or is modeltest (`NumThreads.notAvailable`), so raxml-ng runs with its own auto thread count. Default runs = 1.
- raxmlHPC, "ML search" (`ML`): `[-T N] -f d -m <raxmlSubstitutionModelCmd> -N <runs> [-O] -p <seed> -n <outputId>.tre -s <aln> -w <outDir>`. `-T` only for PTHREADS binaries.
- Seed field: `src/app/Model.js` renders a "Seed" field when `run.haveRandomSeed`; `Run.js` default is `Math.floor(1000000 * Math.random())`, `setRandomSeed` sets it, and `seedParsimony` returns it. `haveRandomSeed` lists `FT, ML, ML+rBS, ML+tBS, BS+con, ...` and `TI` (`Run.js` ~line 1030-1045). The same seed feeds `--seed` (raxml-ng) and `-p` (raxmlHPC).
- ModelTest result to model strings (`modelSelection.ts`): from stdout it takes the third `  > raxml-ng` line (AICc) and the third `  > raxmlHPC-SSE3` line. Measured for this dataset: raxml-ng line `--model TVM+I`, raxmlHPC line `-m GTRCATIX`. `Alignment.setModelFromString` turns these into the UI fields, so the run's commands are `--model TVM+I` (raxml-ng) and `-m GTRCATIX` (raxmlHPC, which only knows GTR here). The two ML runs therefore do not fit the same model.

## 2. ModelTest-NG

Files for prefix `P` (measured): `P.out`, `P.log`, `P.tree`, `P.ckp` (binary checkpoint). Stdout is the same text as `P.log` plus a progress table (`P.log` 205 lines, stdout 307).

- Selected model and score: `P.out`, last block:
  ```
  Summary:
                           Model         Score        Weight
         BIC            TPM2uf+I     2639.0324        0.6626
         AIC               TVM+I     2460.0698        0.2792
        AICc               TVM+I     2465.0698        0.2654
  ```
  Also per criterion: a ranked table (`1  TVM+I  8  -1189.0349  2465.0698 ...`: rank, model, K, lnL, score, delta, weight), then `Best model according to AICc` with `Model:`, `lnL:`, `Frequencies:`, `Subst. Rates:`, `Inv. sites prop:`, `Gamma shape:`, `Score:`, `Weight:`, and a `Commands:` list with the raxml-ng/raxmlHPC model strings the app parses.
- Final log-likelihood of the selected model: `lnL:` (AICc best: -1189.0349).
- Best tree: not a result. `P.tree` is the starting parsimony tree with every branch length `0.100000`. ModelTest does not write an optimised tree.
- Determinism (measured):
  - Two identical runs: `P.out` differs only in the three header paths (`Log:`, `Starting tree:`, `Results:`). The ranked tables and summary are byte-identical.
  - `-p 1`, `-p 2`, `-p 4`: `P.out` differs only in the `threads:` line and paths.
  - x86 `modeltest-ng` (run under Rosetta here, reports `Extensions: SSE3`) versus `modeltest-ng-ARM64`: the selected AICc model is the same (`TVM+I`), but numbers differ in the third or fourth decimal: AICc best lnL -1189.0401 vs -1189.0349, score 2465.0802 vs 2465.0698. The BIC best model is `TPM2uf+I` in both, but lnL -1192.4138 vs -1192.3928. Ranks inside the top 10 reorder (`TIM2+I` is 4th by BIC in both, with scores 2643.9784 vs 2644.2605). So fixtures are per architecture, not only per OS; Mac needs separate arm64 and x86 fixtures if both run.
- Varies run to run and needs masking: the `Log:`, `Starting tree:`, `Results:` paths, the `>>` command line with the `-o` path, the `Creating new checkpoint file:` and `... written to` lines, core count and memory (`Physical cores`, `Memory`, `threads: N/10`), and in stdout the progress table (elapsed `0h:00:01` columns and row order, since models finish out of order). `P.out` itself has no timestamps or elapsed times (grep for "time" finds only the progress table in stdout/log).

## 3. raxml-ng

Files for prefix `P` (measured, before the app adds `.tre` / `.txt`): `P.raxml.bestTree`, `.bestTreeCollapsed`, `.bestModel`, `.startTree`, `.log`, `.rba` (binary). `--all` runs also write `.support`, `.bootstraps`, `.mlTrees`. The app renames after the run (`src/main/startRun.ts`): `.rba` unchanged, `.bestModel` / `.log` / ancestral files get `.txt`, everything else gets `.tre`. So the e2e reads `<id>.raxml.bestTree.tre`, `<id>.raxml.bestModel.txt`, `<id>.raxml.log.txt`.

- Model and score:
  - `P.raxml.bestModel`, one line: `TVM{0.798635/1.148548/0.118746/2.592763/1.000000}+FU{0.336779/0.130545/0.147676/0.385000}+IU{0.863600}, noname = 1-678`.
  - `P.raxml.log` lines: `Model: TVM+FO+I` (the requested `TVM+I` is printed as `TVM+FO+I`), `P-inv (ML): 0.863600`, `Base frequencies (ML): ...`, `Substitution rates (ML): ...`.
- Final log-likelihood: `P.raxml.log`, `Final LogLikelihood: -1184.201009`, and `AIC score: 2450.402017 / AICc score: 2455.817112 / BIC score: 2635.687056`.
- Best tree and branch lengths: `P.raxml.bestTree`, plain Newick, 6-decimal branch lengths, unrooted trifurcation at the top (`(TAXON_1:0.011965,(...),TAXON_19:0.002346);`). Many branches are `0.000001` and the log warns `Best ML tree contains 5 near-zero branches!`; `.bestTreeCollapsed` has those collapsed to polytomies.
- Determinism (measured, seed 12345, `--tree rand{1}`):
  - `--threads 2` twice, `--threads 1`, and no `--threads` (auto): `bestTree`, `bestModel` and `Final LogLikelihood` byte-identical; RF distance 0 and the same -1184.201009.
  - Seed 999: different branch lengths (final lnL -1184.197070, 4e-3 absolute, 3e-6 relative) but RF distance 0 to seed 12345.
- Varies run to run and needs masking (`.log` diff between two identical runs): the `called at` / `finished` timestamps, `Elapsed time:`, the command line (prefix path), `Binary MSA file created: <path>` and the three `... saved to: <absolute path>` lines; `System:` line (CPU, cores, RAM) and `parallelization:` text depend on the host. The `[hh:mm:ss ...]` stamps in the search log also vary. The `.bestTree` and `.bestModel` files contain no paths or times.

## 4. raxmlHPC

Files for `-n N` (measured; app uses `N = <id>.tre`): `RAxML_bestTree.N`, `RAxML_info.N`, `RAxML_log.N`, `RAxML_parsimonyTree.N`, `RAxML_result.N`. The app renames `RAxML_info.<id>.tre` to `RAxML_info.<id>.txt` (`startRun.ts`); the existing e2e accepts either.

- Model: `RAxML_info.N` header lines: `Substitution Matrix: GTR`, `Base frequencies: ML estimate`, and the call line `RAxML was called as follows:`. Estimated values: `alpha[0]: ... invar[0]: ... rates[0] ac ag at cg ct gt: ... ML estimate base freqs[0]: ...` (one line, after the CAT stage).
- Score: `RAxML_info.N`, `Final GAMMA-based Score of best tree -1183.120275`. Also `Inference[0] final GAMMA-based Likelihood: -1183.449461` before the last optimisation, and `Inference[0]: Time ... CAT-based likelihood -1053.887605`. The CAT value is not comparable to the GAMMA ones. Ranges over repeated seeds: -1183.12 (seed 12345), -1183.08 (seed 999).
- Best tree and branch lengths: `RAxML_bestTree.N`, Newick with 20-digit branch lengths, root written as a bifurcation ending `...:0.0;`, and `0.00000100000050002909` for the minimum branch.
- Determinism (measured, `raxmlHPC -f d -N 1 -p 12345`): two runs give byte-identical `RAxML_bestTree` and identical scores. `RAxML_info` differs only in the call line (`-n`), the `Inference[0]: Time` value, the written-file paths (`tree written to file <abs>`, `info written to`, `Best-scoring ML tree written to:`) and `Overall execution time`. A different seed (999) gives RF distance 6 (of 30) and score -1183.084764. Run with `raxmlHPC-PTHREADS-SSE3 -T 2` and seed 12345 the tree has RF 6 versus the serial one and the final score is -1087.342572, so the binary (and likely thread count) is part of the fixture key.
- Cross-binary (measured): raxml-ng best tree versus raxmlHPC best tree, same seed, RF 2 of 30. They are not expected to agree because the models differ (`TVM+I` vs `GTRCATIX`).

## 5. Comparing Newick topology without a new dependency

- In the repo: no Newick parser, no RF code. `grep -i newick|robinson|phylo` over `src`, `e2e`, `jest`, `scripts` and `yarn.lock` finds nothing. The existing e2e only checks `toContain('TAXON_')` and `/[()]/` on the best tree (`e2e/raxmlHPC.spec.js`). `package.json` has no tree, phylogeny or bio library; `node_modules` holds only unrelated matches (`d3-array`, `symbol-tree`, `pidtree`, `detect-newline`).
- Both binaries' Newick uses only plain names, numeric branch lengths, parentheses, commas, one trailing `;`: no quoted labels, comments or support values in these runs. A recursive-descent parser plus bipartition sets is about 35 lines of Node; this was written and used for the RF numbers in this note (unrooted, leaf-set splits normalised on the alphabetically first taxon, RF = symmetric difference of the split sets). Compares trees that differ in root placement or child order as equal (measured: raxml-ng top-level trifurcation vs raxmlHPC bifurcation parse to comparable split sets).
- The bundled `raxml-ng` has `--rfdist` ('compute pair-wise Robinson-Foulds (RF) distances between trees', per `raxml-ng --help`, measured) and `--rf` (alias with `--nofiles --log result`). It needs a tree file with at least 2 trees (with 1 tree: `ERROR: Cannot compute RF distances since tree file contains fewer than 2 trees!`, measured). There is no raxml-ng on Windows, so it cannot be the cross-platform comparer.
- Zero-length caveat (measured): the raxml-ng best tree has 5 branches at 0.000001 and `.bestTreeCollapsed` has RF 5 versus `.bestTree` (the collapsed tree has 5 fewer splits). A topology fixture must pick one file. Seeds 12345 and 999 give identical topology for raxml-ng here but not for raxmlHPC (RF 6), so a pinned seed matters for raxmlHPC.

## 6. Run-to-run variance summary

| Output | Stable under a fixed seed (same host) | Mask or ignore |
| --- | --- | --- |
| ModelTest `P.out` summary and ranked tables | yes, also across `-p` | header paths, `threads:`; cores/memory and progress table in stdout/log |
| ModelTest numbers across arm64/x86 builds | model same, lnL/score differ in 3rd-4th decimal | key fixture by architecture |
| raxml-ng `bestTree`, `bestModel`, `Final LogLikelihood` | yes, also across `--threads` | none; in `.log`: timestamps, elapsed time, absolute paths, `System:` |
| raxmlHPC `RAxML_bestTree`, final score | yes (same binary) | in `RAxML_info`: `-n`, `Time`, written-to paths, `Overall execution time` |
| raxmlHPC serial vs PTHREADS | no (different tree and score) | key fixture by binary |

## 7. Not measured

- Linux and Windows output, x86 Mac builds beyond ModelTest, `raxmlHPC-SSE3` and AVX binaries, and runs where the UI (not these CLI flags) drove the binaries.
- Whether raxml-ng/raxmlHPC output is stable across hosts with different SIMD kernels or CPU counts (only one Apple M4 host).
- `--rfdist` output file format (only the 1-tree error and `--help` text were observed).
