// @ts-nocheck — PROTOTYPE for ticket 229, throwaway.
import { OutGroup, MultistateNumber } from './OptionSubclasses.prototype';

it( 'constructs typed subclasses under Jest', () => {
  const run = { taxons: ['a', 'b'], haveAlignments: true, analysisOption: { params: ['outGroup'] } };
  const out = new OutGroup( run );
  expect( out.value ).toEqual( ['<none>'] );
  out.setValue( ['<none>', 'a'] );
  expect( out.value ).toEqual( ['a'] );
  expect( out.multiple ).toBe( true );
  const n = new MultistateNumber( { run: { usesRaxmlNg: true }, dataType: 'multistate' } );
  expect( n.placeholder ).toBe( 'Integer' );
  expect( n.error ).toBe( true );
  n.setValue( '4' );
  expect( n.error ).toBe( false );
} );
