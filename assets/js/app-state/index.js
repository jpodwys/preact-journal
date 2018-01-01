import cookie from '../cookie';

let loggedIn = !!cookie.get('logged_in');
if(!loggedIn) localStorage.clear();

let appState = {
  entryReady: false,
  loggedIn: loggedIn,
  loading: 0,
  entryIndex: -1,
  entry: undefined,
  entries: JSON.parse(localStorage.getItem('entries')) || undefined
};

export default appState;
