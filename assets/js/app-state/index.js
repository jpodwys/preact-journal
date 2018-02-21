import cookie from '../cookie';
import { sortObjectsByDate } from '../utils';

const getInitialState = function() {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) localStorage.clear();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;
  if(entries) entries = sortObjectsByDate(entries);

  let state = {
    view: '/',
    showFilterInput: false,
    filterText: '',
    entryReady: false,
    loggedIn: loggedIn,
    loading: 0,
    syncing: 0,
    entryIndex: -1,
    entry: undefined,
    entries: entries,
    viewEntries: entries
  };

  return state;
};

export default getInitialState;
