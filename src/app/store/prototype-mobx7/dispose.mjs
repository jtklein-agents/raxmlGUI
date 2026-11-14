// PROTOTYPE. Alignment.dispose: an annotated arrow action over StoreBase's plain arrow field.
import { makeObservable, observable, action, isAction } from 'mobx';

class StoreBase {
  eventStops = [];
  unlisten = () => {
    this.eventStops.length = 0;
  };
  dispose = () => {
    this.unlisten();
  };
}

class InputFile extends StoreBase {
  path = '';
  constructor() {
    super();
    makeObservable( this, { path: observable } );
  }
}

// As today: the subclass redeclares `dispose` as an arrow field and marks it an action.
export class AlignmentArrow extends InputFile {
  modeltestLoading = true;
  cancelled = false;
  constructor() {
    super();
    makeObservable( this, { modeltestLoading: observable, cancelled: observable, dispose: action } );
  }
  dispose = () => {
    this.unlisten();
    if ( this.modeltestLoading ) {
      this.cancelled = true;
    }
  };
}

export const disposeCase = () => {
  const a = new AlignmentArrow();
  a.eventStops.push( 1 );
  a.dispose();
  return `cancelled=${a.cancelled} eventStops=${a.eventStops.length} isAction=${isAction( a.dispose )}`;
};
