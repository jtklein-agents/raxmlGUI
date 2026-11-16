import { observable, computed, action, makeObservable } from 'mobx';
import { mixed } from 'yup';
import type { Schema, ValidationError } from 'yup';

export interface OptionSettings {
  schema?: Schema;
  allowOnlyValidChange?: boolean;
  helperText?: string;
}

class Option<Value = unknown, Owner = unknown> {
  run: Owner;
  defaultValue: Value;
  title: string;
  description: string | undefined;
  hoverInfo: string | undefined;
  schema: Schema;
  allowOnlyValidChange: boolean;
  helperText: string;

  /** Reactive option with optional validation */
  constructor(
    run: Owner,
    defaultValue: Value,
    title: string,
    description?: string,
    hoverInfo?: string,
    { schema = undefined, allowOnlyValidChange = false, helperText = '' }: OptionSettings = {},
  ) {
    makeObservable( this, {
      value: observable,
      setValue: action,
      reset: action,
      isDefault: computed,
      error: computed,
      haveError: computed,
      errorMessage: computed,
    } );
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
  }
  value: Value;
  setValue( value: Value ): void {
    const isValid = this.schema.isValidSync( value );
    if ( !this.allowOnlyValidChange || isValid ) {
      this.value = isValid
        ? this.schema.cast( value ) as Value
        : value;
    }
  }
  reset(): void {
    this.value = this.defaultValue;
  }
  get isDefault(): boolean {
    return this.value === this.defaultValue;
  }
  get error(): ValidationError | boolean | null {
    try {
      this.schema.validateSync( this.value );
      return null;
    } catch ( err ) {
      return err as ValidationError;
    }
  }
  get haveError(): boolean {
    return this.error !== null;
  }
  get errorMessage(): string {
    return this.haveError
      ? ( this.error as ValidationError ).message
      : '';
  }
}

export { Option as default };
