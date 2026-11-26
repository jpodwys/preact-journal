// Shared setup for the action specs (not itself a spec: no `.spec.js` suffix).
import fetchMock from 'fetch-mock';
import { clear as idbClear } from 'idb-keyval';
import { app, resetState } from '../app-state';
import { resetDataFetched } from './entry-actions';

export const tick = (ms = 0) => new Promise(r => setTimeout(r, ms));

// Wait for every in-flight fetch-mock response (and its .json()) plus the
// action's .then/.catch handlers that run after it.
export async function settleNetwork () {
  await fetchMock.flush(true);
  await tick(10);
}

// Retry an (async) assertion until it passes; for effects nothing awaits,
// like the unawaited idb-keyval writes in the stale-user paths.
export async function eventually (fn, timeout = 1000) {
  const start = Date.now();
  for(;;) {
    try { return await fn(); }
    catch(e) {
      if(Date.now() - start > timeout) throw e;
      await tick(10);
    }
  }
}

export const ACCOUNT_1 = { id: 1, username: 'test', active: true };

// Clean slate: no network routes, empty localStorage and IndexedDB, the
// private dataFetched flag cleared, then a store recomputed from that storage.
// `accounts` seeds localStorage first, so `[ACCOUNT_1]` boots logged in as '1'.
export async function resetAll ({ accounts } = {}) {
  // Let the previous test's in-flight responses land first, so a late
  // handler cannot write into this test's fresh state.
  await settleNetwork();
  fetchMock.restore();
  localStorage.clear();
  await idbClear();
  resetDataFetched();
  if(accounts) localStorage.setItem('accounts', JSON.stringify(accounts));
  resetState();
}

// Writes go through the real store (and its watchers). viewEntries is
// computed from the others, so it is assigned last to make a seed stick.
// `entry` is accepted as shorthand for its id, and must be in the entries (or viewEntries) seeded.
export function seed (state) {
  const { viewEntries, entry, entryIndex, ...rest } = state;
  if('entry' in state) rest.entryId = entry && entry.id;   // the entry on screen is stored as its id; the entry and its index are derived
  Object.assign(app, rest);
  if(viewEntries && !rest.entries) app.entries = viewEntries;   // viewEntries() is derived from entries
}

// Actions call route(), which rewrites the real URL; put it back afterwards
// so later specs (and app.view in resetState) see the karma page again.
export function preserveLocation () {
  let href;
  beforeEach(() => { href = location.href; });
  afterEach(() => { history.replaceState(null, null, href); });
}

export const getAccountsFromStorage = () => JSON.parse(localStorage.getItem('accounts'));
