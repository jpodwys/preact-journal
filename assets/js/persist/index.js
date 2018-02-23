import { sortObjectsByDate, filterObjectsByText } from '../utils';

export default function persist(el, state, cb) {
  if(state.entries){
    state.entries = sortObjectsByDate([].concat(state.entries));
    state.viewEntries = filterObjectsByText(el.state.filterText, state.entries);
  }
  el.setState(state, cb);
  if(state.entries){
    localStorage.setItem('entries', JSON.stringify(state.entries.slice(0, 10)));
    localStorage.setItem('moreEntries', JSON.stringify(state.entries.slice(10)));
  }
}
