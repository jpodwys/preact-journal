import cookie from '../cookie';

let appState = {
  loggedIn: !!cookie.get('logged_in'),
  loading: 0,
  entry: {},
  entries: JSON.parse(localStorage.getItem('entries')) || []
};

export default appState;
