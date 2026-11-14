// PROTOTYPE, variant B: explicit makeObservable per class, actions stay arrow fields as today.
// A subclass cannot redeclare an annotated arrow action, so Option.setValue delegates the part
// OutGroup changes to a plain prototype method, `nextValue`.
import { makeObservable, observable, computed, action, override } from 'mobx';
import { mixed } from 'yup';
import { params } from './fakeRun.mjs';

export class Option {
  value;

  constructor(
    run,
    defaultValue,
    title,
    description,
    hoverInfo,
    { schema = undefined, allowOnlyValidChange = false, helperText = '' } = {},
  ) {
    this.run = run;
    this.defaultValue = defaultValue;
    this.title = title;
    this.description = description;
    this.hoverInfo = hoverInfo;
    this.schema = schema
      ? schema
      : mixed();
    this.allowOnlyValidChange = allowOnlyValidChange;
    this.helperText = helperText;
    this.value = defaultValue;
    makeObservable( this, {
      value: observable,
      setValue: action,
      reset: action,
      isDefault: computed,
      error: computed,
      haveError: computed,
      errorMessage: computed,
    } );
  }

  setValue = ( value ) => {
    this.value = this.nextValue( value );
  };

  // Plain method, not annotated: a subclass replaces it freely.
  nextValue( value ) {
    const isValid = this.schema.isValidSync( value );
    if ( this.allowOnlyValidChange && !isValid ) {
      return this.value;
    }
    return isValid
      ? this.schema.cast( value )
      : value;
  }

  reset() {
    this.value = this.defaultValue;
  }

  get isDefault() {
    return this.value === this.defaultValue;
  }

  get error() {
    try {
      this.schema.validateSync( this.value );
      return null;
    } catch ( err ) {
      return err;
    }
  }

  get haveError() {
    return this.error !== null;
  }

  get errorMessage() {
    return this.haveError
      ? this.error.message
      : '';
  }
}

export class OutGroup extends Option {
  constructor( run ) {
    super( run, ['<none>'], 'Outgroup', '' );
    this.multiple = true;
    makeObservable( this, {
      options: computed,
      notAvailable: computed,
      cmdValue: computed,
    } );
  }

  get options() {
    return ['<none>', ...this.run.taxons].map( ( value ) => ( {
      value,
      title: value,
    } ) );
  }

  nextValue( value ) {
    if ( this.value.includes( '<none>' ) ) {
      return value.filter( ( v ) => v !== '<none>' );
    }
    if ( value.includes( '<none>' ) ) {
      return value.filter( ( v ) => v === '<none>' );
    }
    return value;
  }

  get notAvailable() {
    return (
      !this.run.haveAlignments ||
      !this.run.analysisOption.params.includes( params.outGroup )
    );
  }

  get cmdValue() {
    return this.value.includes( '<none>' )
      ? ''
      : this.value.join( ',' );
  }
}

export class MultistateNumber extends Option {
  constructor( alignment ) {
    super( alignment.run, '', 'Number of states' );
    this.alignment = alignment;
    this.placeholder = 'Integer';
    makeObservable( this, {
      notAvailable: computed,
      error: override,
    } );
  }

  get notAvailable() {
    return (
      this.alignment.dataType !== 'multistate' ||
      !this.alignment.run.usesRaxmlNg
    );
  }

  get error() {
    return !this.value || !Number.isInteger( Number( this.value ) );
  }
}
