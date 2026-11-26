import xhr from '../api';
import { findObjectIndexById } from '../utils';
import { get, set as idbSet } from '../idb';
import exportAllEntries from '../export-entries';
import { app, viewEntries, set, selected } from '../app-state';
import { route } from '../../components/router';

let dataFetched = false;


// Rows that just appeared (a new entry, or one that arrived from the server) slide in once.
// This is transient UI state: it is not stored on the entries, so it is never persisted.
// The mark is cleared by app-state once a list has had the rows on screen for the animation.

// Run `ok(userId, data)` when `request` resolves, with the user who made the request; a failure is ignored.
const send = (request, ok) => {
  const userId = app.userId;
  request.then(data => ok(userId, data)).catch(() => {});
};
const patch = (id, body) => xhr('/api/entry/' + id, { method: 'PATCH', body });
const dropSync = ({ needsSync, ...rest }) => rest;

// Every server response lands here: `change(entries)` is applied to the user's entries, and `timestamp` (when given) is
// recorded. For the active user that is the live store; for a user who has since been switched away from it is their cached
// copy in IndexedDB. One transform serves both, so the two cannot drift apart. It never mutates.
function apply (userId, change, timestamp){
  if(userId === app.userId) {
    if(timestamp) app.timestamp = timestamp;
    app.entries = change(app.entries);
  } else {
    if(timestamp) localStorage.setItem('timestamp_' + userId, timestamp);
    get('entries_' + userId).then((entries = []) => idbSet('entries_' + userId, change(entries)));
  }
}

// `change(entry)` returns the new entry, or null to remove it. An entry that is no longer there leaves the list as it was.
const patchEntry = (userId, id, change) => apply(userId, entries => findObjectIndexById(id, entries) < 0 ? entries : entries.flatMap(e => e.id === id ? change(e) || [] : e));

// The server's changes applied to a list: updates replace, deletions remove, anything new goes first.
const merge = (list, changes) => changes.reduce((entries, c) => {
  const i = findObjectIndexById(c.id, entries);
  return i > -1 ? entries.flatMap((e, j) => j === i ? c.deleted ? [] : c : e) : c.deleted ? entries : [c, ...entries];
}, list);

// Reads an account's cached entries and timestamp into the store, then fetches what the server has. `extra` goes first: it carries the new userId, which the persistence watcher
// must see before `entries` so the old account's cache is not overwritten.
// Boot (js/load) and every login/switch go through here.
export function loadAccount (id, extra){
  dataFetched = false;
  return get('entries_' + id).then((entries = []) => {
    set({ ...extra, entries, timestamp: localStorage.getItem('timestamp_' + id) || undefined });
    getEntries();
  });
};

export function getEntries (){
  if(!app.userId) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  if(app.timestamp){
    syncEntries();
  } else {
    send(xhr('/api/entries'), getAllEntriesSuccess);
  }
};

function getAllEntriesSuccess (userId, { timestamp, entries }){
  apply(userId, list => list.concat(entries), timestamp);
};

// Send updates to the server
function syncClientEntries (){
  app.entries.forEach(entry => {
    if(entry.needsSync){
      (entry.newEntry ? createEntry : entry.deleted ? resendDelete : putEntry)({ id: entry.id, entry, clientSync: true });
    }
  });
};

// Get updates from the server
function syncEntries (){
  send(xhr('/api/entries/sync/' + app.timestamp), syncEntriesSuccess);
  syncClientEntries();
};

export function resetDataFetched () {
  dataFetched = false;
};

function syncEntriesSuccess (userId, { entries, timestamp }){
  // Entries that are new to this device slide in once.
  const added = entries.filter(c => !c.deleted && !app.entries.some(e => e.id === c.id)).map(c => c.id);
  if(added.length && userId === app.userId) app.fresh = added;
  apply(userId, list => entries.length ? merge(list, entries) : list, timestamp);
};

export function createEntry ({ entry, clientSync }){
  if(!entry || typeof entry.id !== 'number') return;
  /**
   * When a user navigates to the new entry page, a blank entry is unshifted
   * onto the entries array. Creating an entry is really updating that blank
   * entry, then POSTing it to the back end.
   */
  if(findObjectIndexById(entry.id, app.entries) < 0) return;

  const postPending = entry.postPending, userId = app.userId;
  patchEntry(userId, entry.id, () => ({...entry, postPending: true}));

  /**
   * clientSync overrides postPending to cover the edge case where postPending
   * is set and the user closes the app before the POST returns. If that POST
   * succeeded this can duplicate the entry; if it failed, it does what you
   * would expect.
   */
  if(!clientSync && postPending) return;

  xhr('/api/entry', { method: 'POST', body: { date: entry.date, text: entry.text } })
    .then(data => {
      // The slide-in mark and the entry on screen follow the id from the client's to the server's.
      const swap = id => id === entry.id ? data.id : id;
      if(userId === app.userId) set({ fresh: app.fresh.map(swap), entryId: swap(app.entryId) });
      patchEntry(userId, entry.id, ({ postPending, newEntry, needsSync, ...rest }) => ({ ...rest, id: data.id }));
    })
    .catch(() => patchEntry(userId, entry.id, ({ postPending, ...rest }) => rest));
};

export function toggleFavorite ({ id, favorited }){
  updateEntry({
    entry: { favorited },
    property: 'favorited',
    entryId: id
  });
};

export function updateEntry ({ entry, property, entryId }){
  if(!entry || !property || typeof entryId !== 'number') return;
  const current = app.entries.find(e => e.id === entryId);
  if(!current || current[property] === entry[property]) return;

  patchEntry(app.userId, entryId, e => ({...e, [property]: entry[property], needsSync: true}));

  send(patch(entryId, entry), userId => patchEntry(userId, entryId, dropSync));
};

const putEntry = ({ entry }) => send(patch(entry.id, entry), userId => patchEntry(userId, entry.id, dropSync));

export function showConfirmDeleteEntryModal ({ entry }){
  set({ entryId: entry?.id, dialogMode: 'modal:delete' });
};

export function deleteEntry ({ id }){
  if(typeof id !== 'number') return;

  if(findObjectIndexById(id, app.entries) < 0) return;

  patchEntry(app.userId, id, e => ({...e, needsSync: true, deleted: true, text: ''}));
  set({ entryId: undefined, dialogMode: '' });
  if(app.view !== '/entries') route('/entries', true);

  resendDelete({ id });
};

// Replay of an offline delete: the entry is already marked deleted, so only
// the request is resent (no navigation, no change to the open entry/dialog).
function resendDelete ({ id }){
  send(xhr('/api/entry/' + id, { method: 'DELETE' }), userId => patchEntry(userId, id, () => null));
};

export function newEntry (){
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-CA'),
    text: '',
    needsSync: true,
    newEntry: true
  };

  set({ entryId: entry.id, entries: [entry, ...app.entries] });
  app.fresh = [entry.id];
};

export function filterByText (query = ''){
  if(app.filterText === query) return;
  app.filterText = query;
};

export function toggleSort (){
  set({ sort: app.sort === 'desc' ? 'asc' : 'desc', dialogMode: '' });
};

export function shiftEntry (count){
  const [current, i] = selected();
  if(app.view !== '/entry' || !count || !current) return;
  const entry = viewEntries()[i + count];
  if(entry) route('/entry/' + entry.id, true);
};

export function clearFilters () {
  set({ filter: '', filterText: '' });
};

export function exportEntries () {
  exportAllEntries(viewEntries());
};
