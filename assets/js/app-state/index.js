import cookie from '../cookie';

const getInitialState = function() {
  let loggedIn = !!cookie.get('logged_in');
  if(!loggedIn) localStorage.clear();

  return {
    entryReady: false,
    loggedIn: loggedIn,
    loading: 0,
    syncing: 0,
    entryIndex: -1,
    entry: undefined,
    entries: JSON.parse(localStorage.getItem('entries')) || undefined
  };
};

export default getInitialState;
