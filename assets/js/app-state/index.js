import cookie from '../cookie';

let loggedIn = !!cookie.get('logged_in');
if(!loggedIn) localStorage.clear();

let appState = {
  loggedIn: loggedIn,
  loading: 0,
  entryIndex: -1,
  entry: {},
  entries: JSON.parse(localStorage.getItem('entries')) || []
};

export default appState;
