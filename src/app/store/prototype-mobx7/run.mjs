// PROTOTYPE. Run: `npm install && npm start` in this folder. Node's native class fields are
// define semantics, so nothing is compiled.
import { autorun, configure, isAction, isComputedProp, isObservableProp } from 'mobx';
import { createRequire } from 'node:module';
import * as A from './a-methods.mjs';
import * as B from './b-arrows.mjs';
import { makeRun } from './fakeRun.mjs';
import { failures } from './failures.mjs';
import { disposeCase } from './dispose.mjs';

const warnings = [];
console.warn = ( ...args ) => warnings.push( args.join( ' ' ) );
configure( { enforceActions: 'observed' } );
const { version } = createRequire( import.meta.url )( 'mobx/package.json' );
console.log( `mobx ${version}, node ${process.version}\n` );

const state = ( o ) => JSON.stringify( {
  value: o.value, isDefault: o.isDefault, error: o.error && String( o.error.message ?? o.error ),
  haveError: o.haveError, cmdValue: o.cmdValue, notAvailable: o.notAvailable,
} );

const drive = ( label, V ) => {
  console.log( `=== ${label} ===` );
  const run = makeRun();
  const out = new V.OutGroup( run );
  const reactions = [];
  const stop = autorun( () => reactions.push( out.cmdValue ) );
  const step = ( what, fn ) => {
    fn();
    console.log( `  ${what.padEnd( 34 )} ${state( out )}` );
  };
  console.log( `  ${'OutGroup constructed'.padEnd( 34 )} ${state( out )}` );
  step( "setValue(['<none>','Homo'])", () => out.setValue( ['<none>', 'Homo'] ) );
  step( "setValue(['Homo','Pan'])", () => out.setValue( ['Homo', 'Pan'] ) );
  step( "setValue(['Homo','Pan','<none>'])", () => out.setValue( ['Homo', 'Pan', '<none>'] ) );
  step( "setValue(['Pan'])", () => out.setValue( ['Pan'] ) );
  step( 'reset()', () => out.reset() );
  step( 'run.haveAlignments = false', () => {
    run.haveAlignments = false;
  } );
  stop();
  console.log( `  reactions to cmdValue: ${JSON.stringify( reactions )}` );
  console.log( `  value observable: ${isObservableProp( out, 'value' )}, cmdValue computed: ${isComputedProp( out, 'cmdValue' )}, setValue action: ${isAction( out.setValue )}, reset action: ${isAction( out.reset )}` );

  const alignment = { run: makeRun(), dataType: 'multistate' };
  const multi = new V.MultistateNumber( alignment );
  const errors = [];
  const stop2 = autorun( () => errors.push( multi.error ) );
  multi.setValue( '4' );
  multi.setValue( 'x' );
  stop2();
  console.log( `  MultistateNumber.error over '' -> '4' -> 'x': ${JSON.stringify( errors )} (child getter, computed: ${isComputedProp( multi, 'error' )}), haveError: ${multi.haveError}` );
  if ( V.Analysis ) {
    const plain = new V.Analysis( run );
    plain.setValue( 'ML' );
    console.log( `  Analysis (no makeObservable of its own): value=${plain.value} observable=${isObservableProp( plain, 'value' )}` );
  }
  console.log( `  warnings: ${warnings.length ? warnings.join( ' | ' ) : 'none'}\n` );
  warnings.length = 0;
};

drive( 'Variant A: prototype methods + override', A );
drive( 'Variant B: arrow actions + nextValue hook', B );

console.log( '=== Alignment.dispose (annotated arrow over a plain arrow) ===' );
try {
  console.log( `  works: ${disposeCase()}\n` );
} catch ( err ) {
  console.log( `  THROWS: ${err.message.split( '\n' )[0]}\n` );
}

console.log( '=== Shapes that fail ===' );
for ( const [name, fn] of Object.entries( failures ) ) {
  try {
    console.log( `  ${name}\n      -> ${fn()}` );
  } catch ( err ) {
    console.log( `  ${name}\n      -> THROWS: ${err.message.split( '\n' )[0].slice( 0, 200 )}` );
  }
}
