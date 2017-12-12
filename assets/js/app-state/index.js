var appState = {
  loggedIn: false,
  loading: 0,
  entry: {},
  entries: JSON.parse(localStorage.getItem('entries')) || []
};

export default appState;
