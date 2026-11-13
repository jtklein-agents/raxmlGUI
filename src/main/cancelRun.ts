export type RunId = string | number;

export interface TrackedProcess {
  cancelled?: boolean;
  kill: () => void;
}

export type RunResult =
  | 'SIGTERM'
  | number
  | NodeJS.Signals
  | null
  | Error;

const processes: Record<string, TrackedProcess> = Object.create( null ) as Record<string, TrackedProcess>;
const generation: Record<string, number> = Object.create( null ) as Record<string, number>;

export function beginRun( id: RunId ): number {
  const key = String( id );
  const next = ( generation[key] || 0 ) + 1;
  generation[key] = next;
  return next;
}

export function stillRunning( id: RunId, token: number ): boolean {
  return generation[String( id )] === token;
}

export function trackRun( id: RunId, proc: TrackedProcess ): void {
  processes[String( id )] = proc;
}

export function stopRun( id: RunId ): void {
  const proc = processes[String( id )];
  if ( !proc ) {
    return;
  }
  proc.cancelled = true;
  delete processes[String( id )];
  proc.kill();
  console.log( `Killed RAxML process ${id}` );
}

export function cancelRun( id: RunId ): void {
  const key = String( id );
  generation[key] = ( generation[key] || 0 ) + 1;
  stopRun( id );
}

export function forgetRun( id: RunId, proc: TrackedProcess ): void {
  const key = String( id );
  if ( processes[key] === proc ) {
    delete processes[key];
  }
}

export function runResult(
  proc: TrackedProcess,
  message: string,
  code: number | null,
  signal: NodeJS.Signals | null,
): RunResult {
  if ( proc.cancelled ) {
    return 'SIGTERM';
  }
  if ( message === 'error' ) {
    return code;
  }
  if ( !code ) {
    return signal || code;
  }
  return new Error( `Exited with code ${signal || code}. Check console output for more information.` );
}

export function finishedRun( exitCode: RunResult ): boolean {
  return exitCode !== 'SIGTERM';
}
