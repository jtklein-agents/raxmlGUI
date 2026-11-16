// PROTOTYPE for ticket 229, throwaway. Typed copies of two Option subclasses:
// OutGroup from RunOptions.js and MultistateNumber from AlignmentOptions.js.
import { computed, makeObservable, override } from 'mobx';
import Option from './Option';

interface Choice<Value> {
  value: Value;
  title: string;
}

// Only what this leaf reads from its owner.
interface OptionRun {
  taxons: string[];
  haveAlignments: boolean;
  analysisOption: { params: string[] };
}

interface OptionAlignment {
  run: { usesRaxmlNg: boolean };
  dataType: string;
}

export class OutGroup extends Option<string[], OptionRun> {
  multiple: boolean;

  constructor( run: OptionRun ) {
    super( run, ['<none>'], 'Outgroup', '' );
    makeObservable( this, {
      options: computed,
      setValue: override,
      notAvailable: computed,
      cmdValue: computed,
    } );
    this.multiple = true;
  }
  get options(): Choice<string>[] {
    return ['<none>', ...this.run.taxons].map( ( value ) => ( {
      value,
      title: value,
    } ) );
  }

  setValue( value: string[] ): void {
    if ( this.value.includes( '<none>' ) ) {
      this.value = value.filter( ( v ) => v !== '<none>' );
      return;
    }
    if ( !this.value.includes( '<none>' ) && value.includes( '<none>' ) ) {
      this.value = value.filter( ( v ) => v === '<none>' );
      return;
    }
    this.value = value;
  }

  get notAvailable(): boolean {
    return (
      !this.run.haveAlignments ||
      !this.run.analysisOption.params.includes( 'outGroup' )
    );
  }
  get cmdValue(): string {
    return this.value.includes( '<none>' )
      ? ''
      : this.value.join( ',' );
  }
}

export class MultistateNumber extends Option<string, OptionAlignment['run']> {
  alignment: OptionAlignment;
  placeholder: string;

  constructor( alignment: OptionAlignment ) {
    super( alignment.run, '', 'Number of states' );
    makeObservable( this, {
      notAvailable: computed,
      error: override,
    } );
    this.alignment = alignment;
    this.placeholder = 'Integer';
  }
  get notAvailable(): boolean {
    return (
      this.alignment.dataType !== 'multistate' ||
      !this.alignment.run.usesRaxmlNg
    );
  }
  get error(): boolean {
    return !this.value || !Number.isInteger( Number( this.value ) );
  }
}
