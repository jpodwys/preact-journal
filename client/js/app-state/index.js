import { set as idbSet } from 'idb-keyval';
import { store, watch } from '../../packages/kyvo/core';
import { getViewFromPathname, applyFilters, clearData } from '../utils';

// The one global store. Components import `app` and read it during render; any
// write re-renders the app on the next frame. Replace values, never mutate them
// in place (dev builds freeze assigned values so a mutation throws).
// The 'accounts' localStorage key is read here, once, and written by the watcher below, once.
const loadAccounts = () => {
  try {
    return JSON.parse(localStorage.getItem('accounts')) || [];
  } catch(e) {
    return [];
  }
};

export const initialState = () => {
  const accounts = loadAccounts();
  const active = accounts.find(a => a.active);
  const loggedIn = !!active;
  const userId = active ? String(active.id) : '';
  if (!loggedIn && accounts.length === 0) clearData();
  return {
    accounts,
    loggedIn,
    userId,
    username: active ? active.username : '',
    entries: [],
    sort: 'desc',
    filter: '',
    filterText: '',
    entryIndex: -1,
    entry: undefined,
    dialogMode: '',
    fresh: [],
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true',
    timestamp: userId ? localStorage.getItem('timestamp_' + userId) || undefined : undefined
  };
};

export const app = store(initialState());

// Back to a freshly computed initial state (logout, expired session, tests).
// A reset must not persist: assigning the blank `entries` would overwrite the
// user's cached entries in IndexedDB.
let resetting;
export const resetState = () => {
  resetting = 1;
  try { Object.assign(app, initialState()); } finally { resetting = 0; }
};

// Derived, not stored: there is no field to assign. Memoized on its inputs.
let inputs = [], view;
export const viewEntries = () => {
  const now = [app.view, app.filterText, app.filter, app.sort, app.entries];
  if (now.some((v, i) => v !== inputs[i])) {
    view = applyFilters(...now);
    if (typeof __DEV__ === 'undefined' || __DEV__) Object.freeze(view);
    inputs = now;
  }
  return view;
};

// Computed state plus persistence, in one place so no action can forget either.
watch(app, (key, next, prev) => {
  switch (key) {
    case 'view':
      app.dialogMode = '';
      if (prev === '/search' && next === '/entries') Object.assign(app, { filter: '', filterText: '' });
      break;
    case 'accounts':
      if (!resetting) localStorage.setItem('accounts', JSON.stringify(next));
      break;
    case 'entries':
      if (app.userId && !resetting) idbSet('entries_' + app.userId, next);
      break;
    case 'dark':
      localStorage.setItem('dark', !!next);
      document.body.classList.toggle('dark', !!next);
      break;
    case 'timestamp':
      if (app.userId && next !== undefined) localStorage.setItem('timestamp_' + app.userId, next);
      break;
  }
});

// The body class must match the stored preference on load.
document.body.classList.toggle('dark', app.dark);
