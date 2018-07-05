import cookie from '../cookie';
import { clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();

  let state = {
    entryIndex: -1,
    filterText: '',
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true',
    entries: JSON.parse(localStorage.getItem('entries')) || undefined,
    get viewEntries() { return applyFilters(this.filterText, this.entries); },
    set viewEntries(_) { return; }
  };

  return state;
};
