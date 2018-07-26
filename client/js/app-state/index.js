import cookie from '../cookie';
import { sortObjectsByDate, filterHiddenEntries, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

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
    entryIndex: -1,
    entries: entries,
    viewEntries: viewEntries || entries,
    toastConfig: undefined,
    dark: localStorage.getItem('dark') === 'true'
  };

  const handler = {
    // get: function(obj, prop) {

    // },

    set: function(obj, prop, value) {
      obj[prop] = value;
      switch(prop) {
        case 'entries':     // Fallthrough
        case 'filterText':  obj.viewEntries = applyFilters(obj.filterText, obj.entries); break;
        case 'dark':        localStorage.setItem('dark', !!value);
      }
    }
  };

  return state;
};
