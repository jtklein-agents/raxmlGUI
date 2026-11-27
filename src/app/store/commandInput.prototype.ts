// PROTOTYPE, throwaway. Answers "What the command builders take as input" (issue 417).
// Not imported by the app. The question is a type shape, so this is a typed stub that
// `yarn typecheck` checks against the real Run, not an HTML demo.

import { join, quote } from '../paths';
import type Run from './Run'; // only for the proof at the bottom; the real builder files do not import Run

type CmdArg = string | number;

// The second argument, shaped like the one `quote` already takes.
interface Platform {
  windows: boolean;
}

// --- Shared pieces: each mirrors the nested shape Run already has, so a builder body
// --- moves verbatim with `this.` replaced by `run.`.

interface OutputInput {
  outputDir: string;
  outputNameSafe: string;
}

interface PartitionInput {
  havePartitionFile: boolean;
  partitionFile: string;
  finalAlignment: {
    path: string;
    partitionFilePath: string;
    partition: { isDefault: boolean };
  };
}

interface ConstraintInput {
  backboneConstraint: { isSet: boolean; filePath: string };
  multifurcatingConstraint: { isSet: boolean; filePath: string };
}

// --- One input per builder, listing only what that builder reads.

export interface AstralInput extends OutputInput {
  astralTree: { path: string } | null | undefined;
}

export interface ModeltestNgInput extends OutputInput {
  dataType: string | undefined;
  finalAlignment: { path: string };
  numThreads: { value: number };
}

export interface RaxmlNgInput extends OutputInput, PartitionInput, ConstraintInput {
  analysis: { value: string };
  ngSubstitutionModelCmd: string;
  numThreads: { notAvailable: boolean; value: number };
  seedParsimony: number;
  outGroup: { cmdValue: string };
  numRuns: { value: number };
  numRepetitionsNg: { value: number | string };
  alignments: { length: number };
  tree: { filePath: string };
}

export interface RaxmlInput extends OutputInput, PartitionInput, ConstraintInput {
  analysis: { value: string };
  outputFilenameSafe: string;
  raxmlSubstitutionModelCmd: string;
  numThreads: { notAvailable: boolean; value: number };
  seedParsimony: number;
  seedRapidBootstrap: number;
  seedBootstrap: number;
  substitutionMatrix: { extraCmdValue: string };
  substitutionAscertainment: { extraCmdValue: string };
  multistateModel: { notAvailable: boolean; value: string };
  disableCheckUndeterminedSequence: boolean;
  outGroup: { cmdValue: string };
  branchLength: { value: boolean };
  sHlike: { value: boolean };
  numRuns: { value: number };
  numRepetitions: { value: number | string };
  tree: { notAvailable: boolean; filePath: string };
}

// The dispatch needs the three flags plus everything the builders need. An intersection, not
// `extends`: the builders read different parts of `tree`, and an interface cannot merge those.
export type CommandInput = AstralInput & ModeltestNgInput & RaxmlNgInput & RaxmlInput & {
  usesAstral: boolean;
  usesModeltestNg: boolean;
  usesRaxmlNg: boolean;
};

// --- Signatures. Two small builders are moved in full to show what "verbatim" looks like.

export const astralArgs = ( run: AstralInput, { windows }: Platform ): string[][] => {
  const first: string[] = [];
  if ( run.astralTree ) {
    first.push( '-i', quote( run.astralTree.path, { windows } ) );
  }
  first.push(
    '-o',
    quote( join( run.outputDir, `ASTRAL_${run.outputNameSafe}.tre` ), { windows } ),
  );
  return [first];
};

export const modeltestNgArgs = ( run: ModeltestNgInput, { windows }: Platform ): CmdArg[][] => {
  const first: CmdArg[] = [];
  if ( run.dataType === 'nucleotide' ) {
    first.push( '-d', 'nt' );
  } else if ( run.dataType === 'protein' ) {
    first.push( '-d', 'aa' );
  }
  first.push( '-i', quote( run.finalAlignment.path, { windows } ) );
  first.push(
    '-o',
    quote( join( run.outputDir, `RAxML_GUI_ModelTest_${run.outputNameSafe}` ), { windows } ),
  );
  first.push( '--force' );
  first.push( '-p', run.numThreads.value );
  return [first];
};

export declare const raxmlNgArgs: ( run: RaxmlNgInput, platform: Platform ) => CmdArg[][];
export declare const raxmlArgs: ( run: RaxmlInput, platform: Platform ) => CmdArg[][];

// The `args` getter's dispatch, moved.
export const commandArgs = ( run: CommandInput, platform: Platform ): CmdArg[][] => {
  if ( run.usesAstral ) {
    return astralArgs( run, platform );
  }
  if ( run.usesModeltestNg ) {
    return modeltestNgArgs( run, platform );
  }
  if ( run.usesRaxmlNg ) {
    return raxmlNgArgs( run, platform );
  }
  return raxmlArgs( run, platform );
};

// The `command` getter and the settings-file text: they read `args` plus a few plain values,
// so they take those values, not a run.
export const commandText = ( binary: string, args: CmdArg[][], usesAstral: boolean ): string => args
  .map( ( cmdArgs ) => `${usesAstral
    ? 'java -jar '
    : ''}${binary} ${cmdArgs.join( ' ' )}` )
  .join( ' &&\\\n' );

export declare const settingsText: ( settings: {
  appVersion: string | undefined;
  analysisTitle: string;
  binary: { value: string; version: string | undefined };
  outputDir: string;
  args: CmdArg[][];
} ) => string;

// --- Proof 1: the real Run satisfies the input by passing itself. What stays in Run.ts:
//
//   get args(): CmdArg[][] {
//     return commandArgs( this, { windows } );
//   }
export const proofRunFits = ( run: Run ): CmdArg[][] => commandArgs( run, { windows: false } );

// --- Proof 2: a builder runs on a plain object, with no store, on either platform.
export const proofPlainObject = (): string[][] => astralArgs(
  { astralTree: { path: 'C:\\in\\genes.tre' }, outputDir: 'C:\\out', outputNameSafe: 'run1' },
  { windows: true },
);
