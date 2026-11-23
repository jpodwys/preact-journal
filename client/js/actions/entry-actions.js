import Entry from '../services/entry-service';
import { findObjectIndexById } from '../utils';
import { get, set as idbSet } from 'idb-keyval';
import exportAllEntries from '../export-entries';
import { app, viewEntries } from '../app-state';
import { route } from '../../components/router';
import { handleRouteChange } from './global-actions';

let dataFetched = false;

const set = delta => Object.assign(app, delta);
const isActiveEntryId = id => app.entry?.id === id;

// Rows that just appeared (a new entry, or one that arrived from the server) slide in once.
// This is transient UI state: it is not stored on the entries, so it is never persisted.
let freshTimer;
const markFresh = ids => {
  clearTimeout(freshTimer);          // a second mark restarts the window instead of being cut short by the first
  app.fresh = ids;
  freshTimer = setTimeout(() => { app.fresh = []; }, 450);
};

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
const replace = (list, id, change) => list.flatMap(e => e.id === id ? change(e) || [] : e);

function applyEntryPatch (userId, id, change) {
  // userId is optional; pass undefined to skip the stale-user check
  // (e.g. on failure paths where the response userId isn't available).
  if(userId !== undefined && isStaleUser(userId, entries => replace(entries, id, change))) return;

  const found = app.entries.find(e => e.id === id);
  if(!found) return;
  const next = change(found);
  set({
    entry: isActiveEntryId(id) && next ? {...next} : app.entry,
    entries: app.entries.flatMap(e => e === found ? next || [] : e)
  });
}

export function boot ({ entries }){
  set({ entries: entries });
  getEntries();
  /**
   * If the user is trying to view a specific entry, the route handler has to
   * run again once the entries have been loaded from indexedDB.
   */
  if(app.view === '/entry') handleRouteChange(location.pathname);
};

export function getEntries (){
  if(!app.loggedIn) return dataFetched = false;
  if(dataFetched) return;
  dataFetched = true;
  if(app.timestamp){
    syncEntries();
  } else {
    getAllEntries();
  }
};

function getAllEntries (){
  const userId = app.userId;
  Entry.getAll()
    .then(data => getAllEntriesSuccess(userId, data))
    .catch(() => {});
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
      let func;

      if(entry.newEntry)      func = createEntry;
      else if(entry.deleted)  func = resendDelete;
      else                    func = putEntry;

      func({ id: entry.id, entry: entry, clientSync: true });
    }
  });
};

// Get updates from the server
function syncEntries (){
  const userId = app.userId;
  Entry.sync(app.timestamp)
    .then(data => syncEntriesSuccess(userId, data))
    .catch(() => {});
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

  if(entries.length === 0){
    set({ timestamp });
    return;
  }

  set({ timestamp, entries: applySyncPatch(entries) });
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
  if(added.length) markFresh(added);
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

  // Only mirror into app.entry when it is the entry on screen (a boot replay
  // or a late save must not select it).
  set({ entry: isActiveEntryId(entry.id) ? entry : app.entry, entries: entries });

  /**
   * clientSync overrides postPending to cover the edge case where postPending
   * is set and the user closes the app before the POST returns. If that POST
   * succeeded this can duplicate the entry; if it failed, it does what you
   * would expect.
   */
  if(!clientSync && postPending) return;

  const userId = app.userId;
  Entry.create({ date: entry.date, text: entry.text })
    .then(data => createEntrySuccess(userId, entry.id, data.id))
    .catch(() => createEntryFailure(entry.id));
};

function createEntrySuccess (userId, oldId, id){
  applyEntryPatch(userId, oldId, ({ postPending, newEntry, needsSync, ...rest }) => ({ ...rest, id }));
};

function createEntryFailure (oldId){
  applyEntryPatch(undefined, oldId, ({ postPending, ...rest }) => rest);
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
  // Only the entry on screen is mirrored into app.entry (a late debounced save
  // for an entry the user has navigated away from must not pull it back).
  set({ entry: isActiveEntryId(entryId) ? {...next} : app.entry, entries: entries });

  const userId = app.userId;
  Entry.update(entryId, entry)
    .then(() => updateEntrySuccess(userId, entryId))
    .catch(() => {});
};

function updateEntrySuccess (userId, id){
  applyEntryPatch(userId, id, ({ needsSync, ...rest }) => rest);
};

function putEntry ({ entry }){
  const userId = app.userId;
  Entry.update(entry.id, entry)
    .then(() => updateEntrySuccess(userId, entry.id))
    .catch(() => {});
};

export function showConfirmDeleteEntryModal ({ entry }){
  set({ entry, dialogMode: 'modal:delete' });
};

export function deleteEntry ({ id }){
  if(typeof id !== 'number') return;

  const entryIndex = findObjectIndexById(id, app.entries);
  if(entryIndex === -1) return;

  const entries = app.entries.slice();
  entries[entryIndex] = {...entries[entryIndex], needsSync: true, deleted: true, text: ''};

  set({ entry: undefined, entries: entries, dialogMode: '' });
  if(app.view !== '/entries') route('/entries', true);

  const userId = app.userId;
  Entry.del(id)
    .then(() => deleteEntrySuccess(userId, id))
    .catch(() => {});
};

function deleteEntrySuccess (userId, id){
  applyEntryPatch(userId, id, () => null);
};

// Replay of an offline delete: the entry is already marked deleted, so only
// the request is resent (no navigation, no change to the open entry/dialog).
function resendDelete ({ id }){
  const userId = app.userId;
  Entry.del(id)
    .then(() => deleteEntrySuccess(userId, id))
    .catch(() => {});
};

export function setEntry ({ id }){
  if(!id || id === -1 || !app.entries.length) return;

  // If writing a new entry, look in app.entries, otherwise look in
  // app.viewEntries. Only necessary because new blank entries are unshifted
  // onto app.entries.
  const collection = app.view === '/new' ? app.entries : viewEntries();
  const entryIndex = findObjectIndexById(parseInt(id), collection);
  set({ entry: collection[entryIndex], entryIndex });
};

export function newEntry (){
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-CA'),
    text: '',
    needsSync: true,
    newEntry: true
  };

  set({ entry, entries: [entry, ...app.entries] });
  markFresh([entry.id]);
  setEntry({ id: entry.id });
};

export function filterByText (query = ''){
  if(app.filterText === query) return;
  app.filterText = query;
};

export function toggleSort (){
  set({ sort: app.sort === 'desc' ? 'asc' : 'desc', dialogMode: '' });
};

export function shiftEntry (count){
  if(app.view !== '/entry' || !count || !app.entry) return;
  const entryIndex = findObjectIndexById(parseInt(app.entry.id), viewEntries());
  const entry = viewEntries()[entryIndex + count];
  if(entry) route('/entry/' + entry.id, true);
};

export function clearFilters () {
  set({ filter: '', filterText: '' });
};

export function exportEntries () {
  exportAllEntries(viewEntries());
};
