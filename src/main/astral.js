import path from 'path';
import * as ipc from '../constants/ipc';
import { quote } from '../common/utils';
import {
  binaryDir,
  runProcess,
  send,
} from './processHelpers';

export async function runAstral( event, payload ) {
  const { id, binaryName, args } = payload;
  const javaBin = 'java';
  const [arg] = args;
  arg.splice( 0, 0, '-jar', quote( path.join( binaryDir, binaryName ) ) );
  let exitCode = 0;
  try {
    console.log( 'arg', arg );
    console.log( `ASTRAL?` );
    exitCode = await runProcess( id, event, '', javaBin, arg );
    if ( exitCode !== 0 ) {
      if ( exitCode === 'SIGTERM' ) {
        // Cancelled
        return;
      }
      throw new Error( `Error trying to run ASTRAL, exited with code '${exitCode}'.` );
    }
  }
  catch ( err ) {
    console.error( 'ASTRAL run error:', err );
    send( event, ipc.RUN_ERROR, { id, error: err } );
    return;
  }
  send( event, ipc.ASTRAL_SUCCESS, {
    id,
    exitCode,
  } );
}
