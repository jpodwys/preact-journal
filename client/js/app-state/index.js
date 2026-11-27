import { set as idbSet } from '../idb';
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
  const userId = active ? String(active.id) : '';
  if (!userId && accounts.length === 0) clearData();
  return {
    accounts,
    userId,
    entries: [],
    // sort: 'desc',   // sort order is switched off
    filter: '',
    filterText: '',
    entryId: undefined,
    dialogMode: '',
    fresh: [],
    view: getViewFromPathname(location.pathname),
    dark: localStorage.getItem('dark') === 'true',
    timestamp: userId ? localStorage.getItem('timestamp_' + userId) || undefined : undefined
  };
};

export const app = store(initialState());
export const set = delta => Object.assign(app, delta);

// A logged-in app starts with saving held. Until the cached entries have been read, the list in memory is not the whole
// list, and saving it would overwrite the cache (/entry/new adds an entry that early). loadAccount releases the hold.
let holding = app.userId;
export const releaseSaves = () => { holding = 0; };

// Back to a freshly computed initial state (logout, expired session, tests).
// A reset must not persist: assigning the blank `entries` would overwrite the
// user's cached entries in IndexedDB.
let resetting;
export const resetState = () => {
  resetting = 1;
  holding = 0;
  try { Object.assign(app, initialState()); } finally { resetting = 0; }
};

// Derived, not stored: there is no field to assign. Memoized on its inputs.
let inputs = [], view;
export const viewEntries = () => {
  const now = [app.view, app.filterText, app.filter, /* app.sort, */ app.entries];
  if (now.some((v, i) => v !== inputs[i])) {
    view = applyFilters(...now);
    if (typeof __DEV__ === 'undefined' || __DEV__) Object.freeze(view);
    inputs = now;
  }
  return view;
};

// The entry on screen is stored as an id only. It is looked up in `entries`, not in the list being shown, so it stays
// put when an edit or unfavoriting makes it drop out of a search or the favorites filter. Its position is the one in the
// list being shown (the arrows step through that; a new entry is only in `entries`).
export const selected = () => [
  app.entries.find(e => e.id === app.entryId && !e.deleted),
  (app.view === '/new' ? app.entries : viewEntries()).findIndex(e => e.id === app.entryId)
];

// Rows that just appeared slide in once: the mark is cleared 450 ms after it is set AND a list is showing. A new entry is marked on /new,
// long before the user is back on the list; a second mark restarts the window.
let freshTimer;

// Computed state plus persistence, in one place so no action can forget either.
watch(app, (key, next, prev) => {
  switch (key) {
    case 'view':
      app.dialogMode = '';
      if (prev === '/search' && next === '/entries') Object.assign(app, { filter: '', filterText: '' });
      // falls through: a list coming into view starts the window
    case 'fresh':
      clearTimeout(freshTimer);
      if (app.fresh.length && (app.view === '/entries' || app.view === '/search')) freshTimer = setTimeout(() => { app.fresh = []; }, 450);
      break;
    case 'accounts':
      if (!resetting) localStorage.setItem('accounts', JSON.stringify(next));
      break;
    case 'entries':
      if (app.userId && !resetting && !holding) idbSet('entries_' + app.userId, next);
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
