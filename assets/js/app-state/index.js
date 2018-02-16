import cookie from '../cookie';

const getInitialState = function() {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) localStorage.clear();
  let entries = JSON.parse(localStorage.getItem('entries')) || undefined;

  let state = {
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
