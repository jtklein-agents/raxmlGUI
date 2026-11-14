/* global __static */
import { app, Notification } from 'electron';
import path from 'path';
import childProcess from 'child_process';
import { serializeError } from 'serialize-error';
import * as ipc from '../constants/ipc';
import { is, platform } from '../common/utils';
import { activeWindow } from './utils/utils';
import {
  forgetRun,
  runResult,
  stopRun,
  trackRun,
} from './cancelRun';

export function getStaticDir() {
  if ( process.env.RAXMLGUI_E2E === '1' ) {
    return path.join( __dirname, '..', '..', 'static' );
  }
  return __static;
}

export const get_space_safe_binary_path = ( bin_path ) => {
  // For Windows users with spaces in user dir
  return is.windows
    ? `"${bin_path}"`
    : bin_path;
};

const binParentDir = app.isPackaged
  ? ''
  : platform( {
    macos: 'Mac',
    windows: 'Windows',
    linux: 'Linux',
  } );

export const binaryDir = path.join( getStaticDir(), 'bin', binParentDir );

export function send( event, channel, data ) {
  if ( !data.error ) {
    return event.sender.send( channel, data );
  }
  return event.sender.send( channel, Object.assign( {}, data, { error: serializeError( data.error ) } ) );
}

export function spawnProcess( binaryDir, binaryName, args ) {
  const binaryPath = path.join( binaryDir, binaryName );
  const proc = childProcess.execFile( get_space_safe_binary_path( binaryPath ), args, {
    shell: is.windows,
  } );
  return proc;
}

export async function runProcess( id, event, binaryDir, binaryName, args, { onStdOut = ( _content ) => { }, onStdErr = ( _content ) => { } } = {} ) {
  return new Promise( ( resolve, reject ) => {
    stopRun( id );
    try {
      const proc = spawnProcess( binaryDir, binaryName, args );
      trackRun( id, proc );
      let exited = false;
      proc.stdout.on( 'data', ( buffer ) => {
        const content = String( buffer );
        console.log( 'on stdout:', content );
        onStdOut( content );
        send( event, ipc.RUN_STDOUT, { id, content } );
      } );
      proc.stderr.on( 'data', ( buffer ) => {
        const content = String( buffer );
        console.error( 'on stderr:', content );
        onStdErr( content );
        send( event, ipc.RUN_STDERR, { id, content } );
      } );
      const onQuit = ( message ) => ( code, signal ) => {
        if ( exited ) {
          return;
        }
        console.log( `Process finished with event '${message}' and error/code/signal:`, signal || code );
        exited = true;
        forgetRun( id, proc );
        const result = runResult( proc, message, code, signal );
        const win = activeWindow();
        if ( !win || !win.isFocused() ) {
          const notification = new Notification( {
            title: app.name,
            body: 'Calculation finished',
          } );
          notification.show();
        }
        if ( result === 'SIGTERM' ) {
          return resolve( result );
        }
        if ( message === 'error' || result instanceof Error ) {
          return reject( result ); // code is an error object on 'error' event
        }
        return resolve( result ); // Add code last to get through code 0
      };
      ['error', 'exit', 'close'].forEach( ( message ) => {
        proc.on( message, onQuit( message ) );
      } );
    }
    catch ( err ) {
      console.log( 'Run catch error:', err );
      reject( err );
    }
  } );
}
