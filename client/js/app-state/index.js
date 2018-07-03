import cookie from '../cookie';
import { sortObjectsByDate, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let _filterText = '';
  let _entries = JSON.parse(localStorage.getItem('entries')) || undefined;

  let state = {
    entryIndex: -1,
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true',
    
    get filterText() {
      return _filterText;
    },
    set filterText(filterText) {
      // If the new query is a continuation of the prior query,
      // fitler viewEntries for efficiency.
      // var q = query.toLowerCase();
      // var f = el.state.filterText;
      // var entries = (q.length > f.length && q.indexOf(f) === 0)
      //   ? el.state.viewEntries
      //   : el.state.entries;
      _filterText = filterText;
      this.viewEntries = applyFilters(filterText, _entries);
    },

    get entries() {
      return _entries;
    },
    set entries(entries) {
      _entries = entries;
      this.viewEntries = applyFilters(_filterText, entries);
    }
  };

  state.entries = _entries;

  return state;
};
