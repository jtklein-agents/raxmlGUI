// PROTOTYPE. A stand-in for the page store's Run, just enough for the options to compute.
import { observable } from 'mobx';

export const params = { outGroup: 'outGroup' };
export const makeRun = () => observable( {
  taxons: ['Homo', 'Pan', 'Gorilla'],
  haveAlignments: true,
  usesRaxmlNg: true,
  analysisOption: { params: [params.outGroup] },
} );
