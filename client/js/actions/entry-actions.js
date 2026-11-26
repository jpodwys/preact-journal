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

function updateIdbEntries (userId, updater) {
  get('entries_' + userId).then((entries = []) => {
    const updated = updater(entries) || entries;
    idbSet('entries_' + userId, updated);
  });
}

function isStaleUser (userId, updater) {
  if(app.userId === userId) return false;
  if(updater) updateIdbEntries(userId, updater);
  return true;
}

// `change(entry)` returns the new entry, or null to remove it. It never mutates; the
// same transform serves the live store and a stale user's cached copy in IndexedDB.

function applyEntryPatch (userId, id, change) {
  // userId is optional; pass undefined to skip the stale-user check
  // (e.g. on failure paths where the response userId isn't available).
  if(userId !== undefined && isStaleUser(userId, entries => entries.flatMap(e => e.id === id ? change(e) || [] : e))) return;

  const found = app.entries.find(e => e.id === id);
  if(!found) return;
  const next = change(found);
  set({
    entryId: app.entryId === id && next ? next.id : app.entryId,   // a new entry on screen follows its id from the client's to the server's
    entries: app.entries.flatMap(e => e === found ? next || [] : e)
  });
}

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
  if(!app.loggedIn) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  if(app.timestamp){
    syncEntries();
  } else {
    send(xhr('/api/entries'), getAllEntriesSuccess);
  }
};

function getAllEntriesSuccess (userId, { timestamp, entries }){
  if(isStaleUser(userId, idbEntries => idbEntries.concat(entries))) {
    localStorage.setItem('timestamp_' + userId, timestamp);
    return;
  }
  set({
    timestamp,
    entries: app.entries.concat(entries)
  });
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
  if(isStaleUser(userId, idbEntries => {
    entries.forEach(entry => {
      const idx = findObjectIndexById(entry.id, idbEntries);
      if(idx > -1) {
        if(entry.deleted) idbEntries.splice(idx, 1);
        else idbEntries[idx] = entry;
      } else if(!entry.deleted) {
        idbEntries.push(entry);
      }
    });
  })) {
    localStorage.setItem('timestamp_' + userId, timestamp);
    return;
  }

  set(entries.length ? { timestamp, entries: applySyncPatch(entries) } : { timestamp });
};

// Returns a new entries array with the server's changes applied.
function applySyncPatch (changes){
  const entries = app.entries.slice(), added = [];
  changes.forEach(entry => {
    const entryIndex = findObjectIndexById(entry.id, entries);
    if(entryIndex > -1){
      if(entry.deleted) entries.splice(entryIndex, 1);
      else entries[entryIndex] = entry;
    } else {
      entries.unshift(entry);
      added.push(entry.id);
    }
  });
  if(added.length) app.fresh = added;
  return entries;
};

export function createEntry ({ entry, clientSync }){
  if(!entry || typeof entry.id !== 'number') return;
  /**
   * When a user navigates to the new entry page, a blank entry is unshifted
   * onto the entries array. Creating an entry is really updating that blank
   * entry, then POSTing it to the back end.
   */
  const entryIndex = findObjectIndexById(entry.id, app.entries);
  if(entryIndex === -1) return;

  const postPending = entry.postPending;
  entry = {...entry, postPending: true};
  const entries = app.entries.slice();
  entries[entryIndex] = entry;

  app.entries = entries;

  /**
   * clientSync overrides postPending to cover the edge case where postPending
   * is set and the user closes the app before the POST returns. If that POST
   * succeeded this can duplicate the entry; if it failed, it does what you
   * would expect.
   */
  if(!clientSync && postPending) return;

  const userId = app.userId;
  xhr('/api/entry', { method: 'POST', body: { date: entry.date, text: entry.text } })
    .then(data => {
      if(app.fresh.includes(entry.id)) app.fresh = app.fresh.map(f => f === entry.id ? data.id : f);   // the slide-in mark follows the id
      applyEntryPatch(userId, entry.id, ({ postPending, newEntry, needsSync, ...rest }) => ({ ...rest, id: data.id }));
    })
    .catch(() => applyEntryPatch(undefined, entry.id, ({ postPending, ...rest }) => rest));
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
  const entryIndex = findObjectIndexById(entryId, app.entries);
  if(entryIndex === -1) return;
  const activeEntry = app.entries[entryIndex];
  if(activeEntry[property] === entry[property]) return;

  const next = {...activeEntry, [property]: entry[property], needsSync: true};
  const entries = app.entries.slice();
  entries[entryIndex] = next;
  app.entries = entries;

  send(patch(entryId, entry), userId => applyEntryPatch(userId, entryId, dropSync));
};

const putEntry = ({ entry }) => send(patch(entry.id, entry), userId => applyEntryPatch(userId, entry.id, dropSync));

export function showConfirmDeleteEntryModal ({ entry }){
  set({ entryId: entry?.id, dialogMode: 'modal:delete' });
};

export function deleteEntry ({ id }){
  if(typeof id !== 'number') return;

  const entryIndex = findObjectIndexById(id, app.entries);
  if(entryIndex === -1) return;

  const entries = app.entries.slice();
  entries[entryIndex] = {...entries[entryIndex], needsSync: true, deleted: true, text: ''};

  set({ entryId: undefined, entries, dialogMode: '' });
  if(app.view !== '/entries') route('/entries', true);

  resendDelete({ id });
};

// Replay of an offline delete: the entry is already marked deleted, so only
// the request is resent (no navigation, no change to the open entry/dialog).
function resendDelete ({ id }){
  send(xhr('/api/entry/' + id, { method: 'DELETE' }), userId => applyEntryPatch(userId, id, () => null));
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
