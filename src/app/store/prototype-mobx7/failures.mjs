// PROTOTYPE. The shapes that do not work, each reduced to the smallest class that shows it.
import { makeObservable, makeAutoObservable, observable, computed, action } from 'mobx';

export const failures = {
  'literal conversion: `value = this.defaultValue` as a field initializer': () => {
    class Option {
      value = this.defaultValue;
      constructor( defaultValue ) {
        this.defaultValue = defaultValue;
        makeObservable( this, { value: observable } );
      }
    }
    return `value starts as ${JSON.stringify( new Option( 'GTR' ).value )}, defaultValue is "GTR"`;
  },
  'makeAutoObservable in a class that has a subclass': () => {
    class Option {
      value = 1;
      constructor() {
        makeAutoObservable( this );
      }
    }
    class OutGroup extends Option {}
    return String( new OutGroup().value );
  },
  'makeAutoObservable in a subclass': () => {
    class Option {
      value = 1;
    }
    class OutGroup extends Option {
      constructor() {
        super();
        makeAutoObservable( this );
      }
    }
    return String( new OutGroup().value );
  },
  'subclass redeclares the parent arrow action (OutGroup.setValue today)': () => {
    class Option {
      value = 1;
      constructor() {
        makeObservable( this, { value: observable, setValue: action } );
      }
      setValue = ( v ) => {
        this.value = v;
      };
    }
    class OutGroup extends Option {
      constructor() {
        super();
        makeObservable( this, { setValue: action } );
      }
      setValue = ( v ) => {
        this.value = v * 2;
      };
    }
    const o = new OutGroup();
    o.setValue( 2 );
    return `constructed, value is ${o.value}`;
  },
  'subclass re-annotates a parent computed as `computed`, not `override`': () => {
    class Option {
      constructor() {
        makeObservable( this, { error: computed } );
      }
      get error() {
        return null;
      }
    }
    class MultistateNumber extends Option {
      constructor() {
        super();
        makeObservable( this, { error: computed } );
      }
      get error() {
        return true;
      }
    }
    return String( new MultistateNumber().error );
  },
  'subclass overrides a parent computed and annotates nothing': () => {
    class Option {
      constructor() {
        makeObservable( this, { error: computed } );
      }
      get error() {
        return null;
      }
    }
    class MultistateNumber extends Option {
      get error() {
        return true;
      }
    }
    return `no throw; error is ${new MultistateNumber().error} (the parent's getter was annotated, the child's runs?)`;
  },
};
