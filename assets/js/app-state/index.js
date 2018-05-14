import cookie from '../cookie';
import { sortObjectsByDate, filterHiddenEntries, clearLocalStorage, getViewFromHref } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;
  if(entries) entries = sortObjectsByDate(entries);
  let viewEntries;
  if(entries) viewEntries = filterHiddenEntries(entries);

  let state = {
    scrollPosition: 0,
    view: getViewFromHref(location.href),
    showFilterInput: false,
    filterText: '',
    loggedIn: loggedIn,
    entry: undefined,
    viewEntryIndex: -1,
    entries: entries,
    viewEntries: viewEntries || entries,
    toastConfig: undefined,
    dark: localStorage.getItem('dark') === 'true'
  };

  return state;
};
