import cookie from '../cookie';
import { sortObjectsByDate, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;
  if(entries) entries = sortObjectsByDate(entries);

  let state = {
    entryIndex: -1,
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true',

    filterText: '',
    set setFilterText(filterText) {
      this.filterText = filterText;
      this.viewEntries = applyFilters(filterText, this.entries);
    },

    entries: [],
    set setEntries(entries) {
      this.entries = entries;
      this.viewEntries = applyFilters(this.filterText, entries);
    }
  };

  state.setEntries = entries;

  return state;
};
