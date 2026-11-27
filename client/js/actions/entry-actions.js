import { get } from '../idb';
import exportAllEntries from '../export-entries';
import { app, viewEntries, set, selected, releaseSaves } from '../app-state';
import { route } from '../route';
import { sync, refresh } from '../sync';
import { edit, isNew } from '../sync/record';

// Every action here writes the store first, which persists it, then asks for a sync. None of them talks to the server.

// Reads an account's cached entries and timestamp into the store, then fetches what the server has. `extra` goes first: it carries the new userId, which the persistence watcher
// must see before `entries` so the old account's cache is not overwritten.
// Boot (js/load) and every login/switch go through here. Only boot passes no `extra`: the app is already on screen then, so
// whatever was added during the read is kept alongside the cached entries. A switch replaces the list instead. Saving is
// held from startup until here (see app-state); if the read fails it stays held, which leaves the cache untouched.
export function loadAccount (id, extra){
  return get('entries_' + id).then((cached = []) => {
    const added = extra ? [] : app.entries;
    releaseSaves();
    const kept = cached.filter(e => !isNew(e) || e.text);   // a draft nothing was written in is dropped
    set({ ...extra, entries: [...added, ...kept], timestamp: localStorage.getItem('timestamp_' + id) || undefined });
    refresh();
  });
};

// Changes one entry in the store. Returns whether there was anything to change.
export function editEntry (id, values){
  const current = app.entries.find(e => e.id === id);
  if(!current || current.deleted || Object.keys(values).every(f => current[f] === values[f])) return false;
  app.entries = app.entries.map(e => e.id === id ? edit(e, values) : e);
  return true;
};

export function toggleFavorite ({ id, favorited }){
  if(editEntry(id, { favorited })) sync();
};

export function showConfirmDeleteEntryModal ({ entry }){
  set({ entryId: entry?.id, dialogMode: 'modal:delete' });
};

export function deleteEntry ({ id }){
  if(!editEntry(id, { deleted: true, text: '' })) return;
  set({ entryId: undefined, dialogMode: '' });
  if(app.view !== '/entries') route('/entries', true);
  sync();
};

export function newEntry (){
  const entry = {
    id: Date.now(),
    date: new Date().toLocaleDateString('en-CA'),
    text: '',
    newEntry: true,
    needsSync: 1
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
