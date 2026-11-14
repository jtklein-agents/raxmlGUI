// PROTOTYPE, variant A: explicit makeObservable per class, members as prototype methods.
// A subclass that replaces a parent action or computed annotates it `override`.
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
    // Was `@observable value = this.defaultValue`. A field initializer now runs before this body.
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

  setValue( value ) {
    const isValid = this.schema.isValidSync( value );
    if ( !this.allowOnlyValidChange || isValid ) {
      this.value = isValid
        ? this.schema.cast( value )
        : value;
    }
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

// A subclass with no observable members of its own needs no makeObservable call.
export class Analysis extends Option {
  constructor( run ) {
    super( run, 'FT', 'Analysis' );
  }
}

export class OutGroup extends Option {
  constructor( run ) {
    super( run, ['<none>'], 'Outgroup', '' );
    this.multiple = true;
    makeObservable( this, {
      options: computed,
      setValue: override,
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

  setValue( value ) {
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
