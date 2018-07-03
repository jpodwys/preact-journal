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
      // If the filterText is a continuation of _filterText,
      // fitler viewEntries for efficiency.
      var list = (filterText.length > _filterText.length && filterText.indexOf(_filterText) === 0)
        ? this.viewEntries
        : _entries;

      _filterText = filterText;
      this.viewEntries = applyFilters(filterText, list);
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
