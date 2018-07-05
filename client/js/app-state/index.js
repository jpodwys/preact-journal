import cookie from '../cookie';
import { clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;

  let state = {
    entryIndex: -1,
    filterText: '',
    entries: entries,
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true',
    set viewEntries(_) { return console.warn('Attempted to set computed property viewEntries.'); },
    get viewEntries() {
      return this.filterText
        ? applyFilters(this.filterText, this.entries)
        : this.entries;
    }
  };

  return state;
};
