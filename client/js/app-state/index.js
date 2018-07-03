import compute from '../compute';
import cookie from '../cookie';
import { sortObjectsByDate, clearLocalStorage, getViewFromHref, applyFilters } from '../utils';

export default function getInitialState () {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) clearLocalStorage();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;

  const computedProps = {
    viewEntries: {
      computer: applyFilters,
      args: ['filterText', 'entries']
    }
  };

  let state = {
    entryIndex: -1,
    filterText: '',
    viewEntries: [],
    entries: [],
    entry: undefined,
    scrollPosition: 0,
    loggedIn: loggedIn,
    showFilterInput: false,
    toastConfig: undefined,
    view: getViewFromHref(location.href),
    dark: localStorage.getItem('dark') === 'true'
  };

  let stateProxy = compute(state, computedProps);
  stateProxy.entries = entries;
  return stateProxy;
};
